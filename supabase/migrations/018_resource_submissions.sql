-- Resource Submissions Table
-- Stores user-submitted resources pending admin review and deletion

CREATE TABLE resource_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Submitted resource details
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  resource_type resource_type NOT NULL,
  categories resource_category[] NOT NULL,
  external_url TEXT,
  phone_number TEXT,
  author TEXT,
  source TEXT,

  -- Submitter information
  submitter_name TEXT NOT NULL,
  submitter_email TEXT NOT NULL,
  submitter_notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_resource_submissions_created ON resource_submissions(created_at DESC);

-- Row Level Security
ALTER TABLE resource_submissions ENABLE ROW LEVEL SECURITY;

-- Anyone can submit
CREATE POLICY "Anyone can submit resource"
  ON resource_submissions FOR INSERT
  WITH CHECK (true);

-- Admins can view all submissions
CREATE POLICY "Admins can view submissions"
  ON resource_submissions FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM profiles
      WHERE verification_status = 'meetup_organizer'
      OR email = ANY(string_to_array(current_setting('app.admin_emails', true), ','))
    )
  );

-- Admins can delete submissions
CREATE POLICY "Admins can delete submissions"
  ON resource_submissions FOR DELETE
  USING (
    auth.uid() IN (
      SELECT id FROM profiles
      WHERE verification_status = 'meetup_organizer'
      OR email = ANY(string_to_array(current_setting('app.admin_emails', true), ','))
    )
  );

COMMENT ON TABLE resource_submissions IS 'User-submitted grief resources for admin review and manual addition';
