-- Add service/fundraising links to memorials
-- Allows families to share GoFundMe, memorial funds, etc.

ALTER TABLE public.memorials
ADD COLUMN service_links JSONB;

COMMENT ON COLUMN public.memorials.service_links IS 'Links to funeral services, GoFundMe, memorial funds, etc. Stored as JSON array';

-- Example structure:
-- [
--   {"type": "gofundme", "url": "https://gofundme.com/...", "title": "Funeral Expenses Fund"},
--   {"type": "service", "url": "https://funeralhome.com/...", "title": "Memorial Service Details"},
--   {"type": "charity", "url": "https://charity.org/donate", "title": "Donate to Favorite Charity"}
-- ]
