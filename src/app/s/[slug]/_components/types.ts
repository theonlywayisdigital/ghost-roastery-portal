export interface RoasterBranding {
  id: string;
  business_name: string;
  brand_logo_url: string | null;
  brand_primary_colour: string;
  brand_accent_colour: string;
  brand_heading_font: string;
  brand_body_font: string;
  brand_tagline: string | null;
  brand_hero_image_url: string | null;
  brand_about: string | null;
  brand_instagram: string | null;
  brand_facebook: string | null;
  brand_tiktok: string | null;
  storefront_type: string;
  minimum_wholesale_order: number | null;
  retail_enabled: boolean;
  stripe_account_id: string | null;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  unit: string;
  image_url: string | null;
  sort_order: number;
  product_type: string;
  retail_price: number | null;
  is_purchasable: boolean;
  retail_stock_count: number | null;
  track_stock: boolean;
}

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  unit: string;
  quantity: number;
  imageUrl: string | null;
}
