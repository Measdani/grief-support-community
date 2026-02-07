-- ============================================
-- Memorial Store System
-- Digital products purchasable for memorials
-- ============================================

-- Product Categories & Types
CREATE TYPE product_type AS ENUM (
  'icon',           -- Small decorative icons
  'image',          -- Digital memorial images
  'card',           -- Printable condolence cards
  'keepsake'        -- Digital keepsakes (poems, frames, etc)
);

CREATE TYPE product_status AS ENUM (
  'active',
  'draft',
  'archived'
);

-- Products Table
CREATE TABLE IF NOT EXISTS public.store_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Product Details
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  product_type product_type NOT NULL,
  price_cents INTEGER NOT NULL, -- Price in cents (e.g., 299 = $2.99)

  -- Digital Assets
  preview_image_url TEXT NOT NULL, -- Preview shown in store
  digital_asset_path TEXT NOT NULL, -- Path in Supabase Storage bucket

  -- Metadata
  tags TEXT[], -- For filtering/search: 'angel', 'butterfly', 'floral', etc
  display_order INTEGER DEFAULT 0, -- For sorting in store
  status product_status DEFAULT 'active',

  -- Stats
  purchase_count INTEGER DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Orders Table
CREATE TABLE IF NOT EXISTS public.store_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Customer
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Payment
  total_amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'usd',
  stripe_checkout_session_id TEXT UNIQUE, -- Stripe Checkout Session ID
  stripe_payment_intent_id TEXT, -- Populated after successful payment

  -- Status
  payment_status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'failed', 'refunded'
  fulfillment_status TEXT DEFAULT 'pending', -- 'pending', 'fulfilled', 'failed'

  -- Customer Info (snapshot at time of purchase)
  customer_email TEXT NOT NULL,
  customer_name TEXT,

  -- Timestamps
  paid_at TIMESTAMP WITH TIME ZONE,
  fulfilled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Order Items (individual products in an order)
CREATE TABLE IF NOT EXISTS public.store_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  order_id UUID NOT NULL REFERENCES public.store_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.store_products(id) ON DELETE RESTRICT,
  memorial_id UUID NOT NULL REFERENCES public.memorials(id) ON DELETE CASCADE,

  -- Price snapshot (in case product price changes later)
  price_cents INTEGER NOT NULL,

  -- Optional message from purchaser
  dedication_message TEXT,

  -- Product snapshot (in case product is deleted/changed)
  product_snapshot JSONB NOT NULL, -- Store product details at time of purchase

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Memorial Purchases (junction table - what's displayed on memorials)
-- This gets populated AFTER payment is successful
CREATE TABLE IF NOT EXISTS public.memorial_store_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  memorial_id UUID NOT NULL REFERENCES public.memorials(id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL REFERENCES public.store_order_items(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.store_products(id) ON DELETE RESTRICT,

  -- Purchaser Info (for attribution on memorial page)
  purchased_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  purchaser_name TEXT NOT NULL, -- Snapshot
  dedication_message TEXT,

  -- Product Details (snapshot)
  product_name TEXT NOT NULL,
  product_type product_type NOT NULL,
  preview_image_url TEXT NOT NULL,

  -- Access
  digital_asset_path TEXT NOT NULL, -- For download access

  -- Display
  is_visible BOOLEAN DEFAULT true, -- Memorial creator can hide
  display_order INTEGER DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Prevent duplicate purchases (same product on same memorial by same user)
  UNIQUE(memorial_id, product_id, purchased_by)
);

-- Enable RLS
ALTER TABLE public.store_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memorial_store_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Products
CREATE POLICY "Anyone can view active products"
  ON public.store_products FOR SELECT
  USING (status = 'active');

CREATE POLICY "Admin can manage all products"
  ON public.store_products FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM public.profiles WHERE is_admin = true
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM public.profiles WHERE is_admin = true
    )
  );

-- RLS Policies: Orders
CREATE POLICY "Users can view own orders"
  ON public.store_orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create orders"
  ON public.store_orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies: Order Items
CREATE POLICY "Users can view own order items"
  ON public.store_order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.store_orders
      WHERE id = order_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create order items"
  ON public.store_order_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.store_orders
      WHERE id = order_id AND user_id = auth.uid()
    )
  );

-- RLS Policies: Memorial Store Items (PUBLIC - anyone can see purchased items)
CREATE POLICY "Anyone can view store items on public memorials"
  ON public.memorial_store_items FOR SELECT
  USING (
    is_visible = true AND
    EXISTS (
      SELECT 1 FROM public.memorials
      WHERE id = memorial_id
      AND (is_public = true OR created_by = auth.uid())
    )
  );

CREATE POLICY "Memorial creators can update visibility"
  ON public.memorial_store_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.memorials
      WHERE id = memorial_id AND created_by = auth.uid()
    )
  );

-- Indexes for performance
CREATE INDEX idx_store_products_type ON public.store_products(product_type);
CREATE INDEX idx_store_products_status ON public.store_products(status);
CREATE INDEX idx_store_products_display_order ON public.store_products(display_order);
CREATE INDEX idx_store_orders_user ON public.store_orders(user_id);
CREATE INDEX idx_store_orders_payment_status ON public.store_orders(payment_status);
CREATE INDEX idx_store_orders_stripe_session ON public.store_orders(stripe_checkout_session_id);
CREATE INDEX idx_store_order_items_order ON public.store_order_items(order_id);
CREATE INDEX idx_store_order_items_memorial ON public.store_order_items(memorial_id);
CREATE INDEX idx_memorial_store_items_memorial ON public.memorial_store_items(memorial_id);
CREATE INDEX idx_memorial_store_items_purchaser ON public.memorial_store_items(purchased_by);

-- Triggers for updated_at
CREATE TRIGGER update_store_products_updated_at
  BEFORE UPDATE ON public.store_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_store_orders_updated_at
  BEFORE UPDATE ON public.store_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to update product purchase count
CREATE OR REPLACE FUNCTION public.update_product_purchase_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.store_products
    SET purchase_count = purchase_count + 1
    WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_memorial_store_item_created
  AFTER INSERT ON public.memorial_store_items
  FOR EACH ROW EXECUTE FUNCTION public.update_product_purchase_count();

COMMENT ON TABLE public.store_products IS 'Digital products available for purchase (icons, images, cards, keepsakes)';
COMMENT ON TABLE public.store_orders IS 'Customer orders with Stripe payment tracking';
COMMENT ON TABLE public.store_order_items IS 'Line items in orders with memorial dedication';
COMMENT ON TABLE public.memorial_store_items IS 'Purchased items displayed on memorial pages';
