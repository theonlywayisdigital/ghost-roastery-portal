-- Create product_images table for multi-image support
CREATE TABLE product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  roaster_id uuid NOT NULL REFERENCES partner_roasters(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  url text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookup by product
CREATE INDEX idx_product_images_product_id ON product_images (product_id);

-- Index for ordering
CREATE INDEX idx_product_images_sort_order ON product_images (product_id, sort_order);

-- Migrate existing image_url data into product_images
INSERT INTO product_images (product_id, roaster_id, storage_path, url, sort_order, is_primary)
SELECT
  p.id,
  p.roaster_id,
  -- Extract storage path from public URL (after /object/public/product-images/)
  CASE
    WHEN p.image_url LIKE '%/object/public/product-images/%'
    THEN substring(p.image_url from '/object/public/product-images/(.+)$')
    ELSE ''
  END,
  p.image_url,
  0,
  true
FROM products p
WHERE p.image_url IS NOT NULL AND p.image_url != '';
