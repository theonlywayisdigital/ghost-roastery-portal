-- Add 'roast_undo' to green_bean_movements and roasted_stock_movements CHECK constraints
-- Used when bulk-undoing roast logs to reverse stock changes.

ALTER TABLE green_bean_movements DROP CONSTRAINT IF EXISTS green_bean_movements_movement_type_check;
ALTER TABLE green_bean_movements ADD CONSTRAINT green_bean_movements_movement_type_check
  CHECK (movement_type IN ('purchase', 'roast_deduction', 'adjustment', 'waste', 'return', 'order_deduction', 'cancellation_return', 'roast_undo'));

ALTER TABLE roasted_stock_movements DROP CONSTRAINT IF EXISTS roasted_stock_movements_movement_type_check;
ALTER TABLE roasted_stock_movements ADD CONSTRAINT roasted_stock_movements_movement_type_check
  CHECK (movement_type IN ('roast_addition', 'order_deduction', 'cancellation_return', 'adjustment', 'waste', 'roast_undo'));
