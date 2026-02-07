-- Sponsors and Advertising System
-- Manages company sponsorships and advertising inquiries

-- Sponsor tier enum
CREATE TYPE sponsor_tier AS ENUM ('platinum', 'gold', 'silver', 'bronze', 'community');

-- Sponsor status enum
CREATE TYPE sponsor_status AS ENUM ('active', 'pending', 'paused', 'expired');

-- Ad placement locations enum
CREATE TYPE ad_placement_location AS ENUM (
  'homepage_banner',
  'resources_sidebar',
  'forums_banner',
  'meetups_sidebar',
  'newsletter',
  'sponsors_page'
);

-- Sponsors table
CREATE TABLE sponsors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  logo_url TEXT,
  website_url TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_name TEXT,
  tier sponsor_tier NOT NULL DEFAULT 'community',
  status sponsor_status NOT NULL DEFAULT 'pending',

  -- Contract details
  start_date DATE,
  end_date DATE,
  monthly_rate_cents INTEGER,

  -- Display settings
  display_order INTEGER DEFAULT 0,
  show_on_homepage BOOLEAN DEFAULT false,
  tagline TEXT, -- Short tagline for banner ads

  -- Categories they can appear in (grief-related niches)
  categories TEXT[] DEFAULT '{}',

  -- Stats
  total_impressions INTEGER DEFAULT 0,
  total_clicks INTEGER DEFAULT 0,

  -- Metadata
  notes TEXT, -- Admin notes
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ
);

-- Ad placements - which sponsors appear where
CREATE TABLE ad_placements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id UUID NOT NULL REFERENCES sponsors(id) ON DELETE CASCADE,
  location ad_placement_location NOT NULL,
  is_active BOOLEAN DEFAULT true,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(sponsor_id, location)
);

-- Track impressions for analytics
CREATE TABLE ad_impressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id UUID NOT NULL REFERENCES sponsors(id) ON DELETE CASCADE,
  placement_id UUID REFERENCES ad_placements(id) ON DELETE SET NULL,
  location ad_placement_location NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ip_hash TEXT, -- Hashed IP for unique counting without storing PII
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Track clicks for analytics
CREATE TABLE ad_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id UUID NOT NULL REFERENCES sponsors(id) ON DELETE CASCADE,
  placement_id UUID REFERENCES ad_placements(id) ON DELETE SET NULL,
  location ad_placement_location NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ip_hash TEXT,
  clicked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Advertising inquiries from potential sponsors
CREATE TABLE advertising_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  phone TEXT,
  website_url TEXT,
  company_description TEXT NOT NULL,

  -- What they're interested in
  interested_tiers sponsor_tier[] DEFAULT '{}',
  interested_placements ad_placement_location[] DEFAULT '{}',
  budget_range TEXT, -- e.g., "$500-1000/month"

  message TEXT NOT NULL,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'new', -- new, contacted, negotiating, converted, declined
  admin_notes TEXT,
  responded_by UUID REFERENCES profiles(id),
  responded_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_sponsors_status ON sponsors(status);
CREATE INDEX idx_sponsors_tier ON sponsors(tier);
CREATE INDEX idx_sponsors_show_homepage ON sponsors(show_on_homepage) WHERE show_on_homepage = true;
CREATE INDEX idx_ad_placements_location ON ad_placements(location) WHERE is_active = true;
CREATE INDEX idx_ad_impressions_sponsor ON ad_impressions(sponsor_id);
CREATE INDEX idx_ad_impressions_date ON ad_impressions(recorded_at);
CREATE INDEX idx_ad_clicks_sponsor ON ad_clicks(sponsor_id);
CREATE INDEX idx_advertising_inquiries_status ON advertising_inquiries(status);

-- Update sponsors stats trigger
CREATE OR REPLACE FUNCTION update_sponsor_impression_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE sponsors
  SET total_impressions = total_impressions + 1
  WHERE id = NEW.sponsor_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sponsor_impression
  AFTER INSERT ON ad_impressions
  FOR EACH ROW
  EXECUTE FUNCTION update_sponsor_impression_count();

CREATE OR REPLACE FUNCTION update_sponsor_click_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE sponsors
  SET total_clicks = total_clicks + 1
  WHERE id = NEW.sponsor_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sponsor_click
  AFTER INSERT ON ad_clicks
  FOR EACH ROW
  EXECUTE FUNCTION update_sponsor_click_count();

-- Updated at trigger for sponsors
CREATE TRIGGER update_sponsors_updated_at
  BEFORE UPDATE ON sponsors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_placements ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_impressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE advertising_inquiries ENABLE ROW LEVEL SECURITY;

-- Sponsors: Anyone can view active sponsors
CREATE POLICY "Anyone can view active sponsors"
  ON sponsors FOR SELECT
  USING (status = 'active');

-- Sponsors: Admins can manage all
CREATE POLICY "Admins can manage sponsors"
  ON sponsors FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND (
        verification_status = 'meetup_organizer'
        OR email = ANY(string_to_array(current_setting('app.admin_emails', true), ','))
      )
    )
  );

-- Ad placements: Anyone can view active
CREATE POLICY "Anyone can view active placements"
  ON ad_placements FOR SELECT
  USING (is_active = true);

-- Ad placements: Admins can manage
CREATE POLICY "Admins can manage placements"
  ON ad_placements FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND verification_status = 'meetup_organizer'
    )
  );

-- Impressions: Insert only (for tracking)
CREATE POLICY "Anyone can record impressions"
  ON ad_impressions FOR INSERT
  WITH CHECK (true);

-- Clicks: Insert only (for tracking)
CREATE POLICY "Anyone can record clicks"
  ON ad_clicks FOR INSERT
  WITH CHECK (true);

-- Advertising inquiries: Anyone can submit
CREATE POLICY "Anyone can submit inquiry"
  ON advertising_inquiries FOR INSERT
  WITH CHECK (true);

-- Advertising inquiries: Admins can view and manage
CREATE POLICY "Admins can manage inquiries"
  ON advertising_inquiries FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND verification_status = 'meetup_organizer'
    )
  );

-- Seed some sponsor tiers info (as a reference, stored in app code)
COMMENT ON TYPE sponsor_tier IS 'Platinum: $2000/mo, Gold: $1000/mo, Silver: $500/mo, Bronze: $200/mo, Community: Free/Trade';
