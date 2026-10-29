// Shared frontend data types.

export interface ProductVariant {
  id: string;
  product_id: string;
  name: string;
  sku: string;
  pack_size: number;
  price_paise: number;
  compare_at_price_paise: number | null;
  stock_quantity: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  description: string;
  flavor: string;
  category: string;
  image_url: string;
  gallery_json: string;
  ingredients: string;
  nutrition_json: string;
  usage_instructions: string;
  is_active: number;
  is_verified_price: number;
  created_at: string;
  updated_at: string;
  variants?: ProductVariant[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  variant_id: string;
  product_name: string;
  variant_name: string;
  sku: string;
  quantity: number;
  unit_price_paise: number;
  total_price_paise: number;
  image_url: string | null;
  created_at?: string;
}

export interface Customer {
  id: string;
  email: string;
  name: string;
  phone: string;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  order_reference: string;
  customer_id?: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address_line1: string;
  shipping_address_line2: string | null;
  shipping_city: string;
  shipping_state: string;
  shipping_postal_code: string;
  shipping_country: string;
  subtotal_paise: number;
  discount_paise: number;
  tax_paise: number;
  shipping_paise: number;
  total_paise: number;
  currency: string;
  payment_status: 'created' | 'pending' | 'authorized' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';
  fulfilment_status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  razorpay_signature: string | null;
  notes: string | null;
  tracking_carrier: string | null;
  tracking_number: string | null;
  cancellation_status?: 'requested' | 'approved' | 'rejected' | null;
  cancellation_reason?: string | null;
  cancellation_requested_at?: string | null;
  cancellation_admin_notes?: string | null;
  stock_restored?: number;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
  refunds?: Refund[];
}

export interface Refund {
  id: string;
  order_id: string;
  razorpay_refund_id: string | null;
  razorpay_payment_id: string | null;
  amount_paise: number;
  currency: string;
  reason: string | null;
  status: 'processed' | 'pending' | 'failed';
  restocked: number;
  initiated_by: 'customer' | 'admin' | 'webhook';
  notes: string | null;
  created_at: string;
}

export interface CartValidationResult {
  valid: boolean;
  subtotal_paise: number;
  shipping_paise: number;
  tax_paise: number;
  discount_paise: number;
  total_paise: number;
  items: {
    product_id: string;
    variant_id: string;
    product_name: string;
    variant_name: string;
    sku: string;
    quantity: number;
    unit_price_paise: number;
    total_price_paise: number;
    image_url: string;
  }[];
  errors: string[];
}

