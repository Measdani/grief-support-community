// Store Product Types
export type ProductType = 'icon' | 'image' | 'card' | 'keepsake'
export type ProductStatus = 'active' | 'draft' | 'archived'

export interface StoreProduct {
  id: string
  name: string
  description: string
  product_type: ProductType
  price_cents: number
  preview_image_url: string
  digital_asset_path: string
  tags: string[] | null
  display_order: number
  status: ProductStatus
  purchase_count: number
  created_at: string
  updated_at: string
}

// Order Types
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded'
export type FulfillmentStatus = 'pending' | 'fulfilled' | 'failed'

export interface StoreOrder {
  id: string
  user_id: string
  total_amount_cents: number
  currency: string
  stripe_checkout_session_id: string | null
  stripe_payment_intent_id: string | null
  payment_status: PaymentStatus
  fulfillment_status: FulfillmentStatus
  customer_email: string
  customer_name: string | null
  paid_at: string | null
  fulfilled_at: string | null
  created_at: string
  updated_at: string
}

export interface ProductSnapshot {
  name: string
  type: ProductType
  description: string
  preview_image_url: string
  digital_asset_path: string
}

export interface StoreOrderItem {
  id: string
  order_id: string
  product_id: string
  memorial_id: string
  price_cents: number
  dedication_message: string | null
  product_snapshot: ProductSnapshot
  created_at: string
}

// Memorial Store Items (displayed on memorial pages)
export interface MemorialStoreItem {
  id: string
  memorial_id: string
  order_item_id: string
  product_id: string
  purchased_by: string
  purchaser_name: string
  dedication_message: string | null
  product_name: string
  product_type: ProductType
  preview_image_url: string
  digital_asset_path: string
  is_visible: boolean
  display_order: number
  created_at: string
}

// Extended types with relations
export interface MemorialStoreItemWithPurchaser extends MemorialStoreItem {
  purchaser?: {
    display_name: string | null
    email: string
  }
}

// Cart types (client-side)
export interface CartItem {
  productId: string
  memorialId: string
  memorialName: string
  productName: string
  productType: string
  priceCents: number
  previewImageUrl: string
  dedicationMessage?: string
}

// API Response types
export interface ProductsResponse {
  products: StoreProduct[]
}

export interface CheckoutResponse {
  sessionId: string
  url: string
}

// Service Link types (from memorial)
export type ServiceLinkType = 'gofundme' | 'memorial_fund' | 'funeral_service' | 'charity'

export interface ServiceLink {
  type: ServiceLinkType
  url: string
  title: string
}
