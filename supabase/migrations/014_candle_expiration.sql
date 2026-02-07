-- ============================================
-- Add candle expiration feature
-- Candles now expire after 1 hour
-- ============================================

-- Add expires_at column to memorial_candles
ALTER TABLE public.memorial_candles
ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE;

-- Update existing candles to expire 1 hour after they were created
UPDATE public.memorial_candles
SET expires_at = created_at + INTERVAL '1 hour'
WHERE expires_at IS NULL;

-- Make expires_at NOT NULL for new candles
ALTER TABLE public.memorial_candles
ALTER COLUMN expires_at SET NOT NULL;

-- Add index for efficient expiration queries
CREATE INDEX idx_memorial_candles_expires ON public.memorial_candles(expires_at);

COMMENT ON COLUMN public.memorial_candles.expires_at IS 'Candles expire 1 hour after being lit';
