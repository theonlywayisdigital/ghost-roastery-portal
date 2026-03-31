-- Add green_bean_id FK to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS green_bean_id uuid REFERENCES green_beans(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_products_green_bean ON products(green_bean_id);

-- Extend green_bean_movements.movement_type CHECK to include order_deduction and cancellation_return
ALTER TABLE green_bean_movements DROP CONSTRAINT IF EXISTS green_bean_movements_movement_type_check;
ALTER TABLE green_bean_movements ADD CONSTRAINT green_bean_movements_movement_type_check
  CHECK (movement_type IN ('purchase', 'roast_deduction', 'adjustment', 'waste', 'return', 'order_deduction', 'cancellation_return'));
