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
  storefront_logo_size: "small" | "medium" | "large" | null;
  storefront_nav_colour: string | null;
  storefront_nav_text_colour: string | null;
  storefront_button_colour: string | null;
  storefront_button_text_colour: string | null;
  storefront_bg_colour: string | null;
  storefront_text_colour: string | null;
  storefront_button_style: "sharp" | "rounded" | "pill";
  storefront_nav_fixed: boolean;
  storefront_nav_transparent: boolean;
}

export interface ProductVariant {
  id: string;
  retail_price: number | null;
  is_active: boolean | null;
  channel: string | null;
  unit: string | null;
  weight_grams: number | null;
  grind_type: { id: string; name: string } | null;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  unit: string;
  image_url: string | null;
  sort_order: number;
  is_retail: boolean;
  is_wholesale: boolean;
  retail_price: number | null;
  is_purchasable: boolean;
  retail_stock_count: number | null;
  track_stock: boolean;
  product_variants?: ProductVariant[] | null;
}

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  unit: string;
  quantity: number;
  imageUrl: string | null;
  variantId: string | null;
  variantLabel: string | null;
}
