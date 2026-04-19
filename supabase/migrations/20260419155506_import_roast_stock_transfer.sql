-- ══════════════════════════════════════════════════════════════
-- Atomic stock transfer for roast log imports
-- Deducts green bean stock AND adds roasted stock in one TX.
-- If either side fails, both roll back.
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION import_roast_stock_transfer(
  p_roaster_id    uuid,
  p_green_bean_id uuid,
  p_roasted_stock_id uuid,
  p_green_qty_kg  decimal,
  p_roasted_qty_kg decimal,
  p_reference_id  uuid,
  p_batch_label   text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_green_balance  decimal;
  v_roasted_balance decimal;
  v_note_suffix    text;
BEGIN
  v_note_suffix := COALESCE(p_batch_label, p_reference_id::text);

  -- 1. Deduct green bean stock
  UPDATE green_beans
    SET current_stock_kg = GREATEST(0, current_stock_kg - p_green_qty_kg)
  WHERE id = p_green_bean_id
    AND roaster_id = p_roaster_id
  RETURNING current_stock_kg INTO v_green_balance;

  IF v_green_balance IS NULL THEN
    RAISE EXCEPTION 'Green bean % not found for roaster %', p_green_bean_id, p_roaster_id;
  END IF;

  -- 2. Record green bean movement
  INSERT INTO green_bean_movements (
    roaster_id, green_bean_id, movement_type, quantity_kg,
    balance_after_kg, reference_id, reference_type, notes
  ) VALUES (
    p_roaster_id, p_green_bean_id, 'roast_deduction', -p_green_qty_kg,
    v_green_balance, p_reference_id, 'roast_log',
    'Import: Roast deduction for batch ' || v_note_suffix
  );

  -- 3. Add to roasted stock
  UPDATE roasted_stock
    SET current_stock_kg = current_stock_kg + p_roasted_qty_kg
  WHERE id = p_roasted_stock_id
    AND roaster_id = p_roaster_id
  RETURNING current_stock_kg INTO v_roasted_balance;

  IF v_roasted_balance IS NULL THEN
    RAISE EXCEPTION 'Roasted stock % not found for roaster %', p_roasted_stock_id, p_roaster_id;
  END IF;

  -- 4. Record roasted stock movement
  INSERT INTO roasted_stock_movements (
    roaster_id, roasted_stock_id, movement_type, quantity_kg,
    balance_after_kg, reference_id, reference_type, notes
  ) VALUES (
    p_roaster_id, p_roasted_stock_id, 'roast_addition', p_roasted_qty_kg,
    v_roasted_balance, p_reference_id, 'roast_log',
    'Import: Roast output from batch ' || v_note_suffix
  );

  RETURN jsonb_build_object(
    'green_balance_kg', v_green_balance,
    'roasted_balance_kg', v_roasted_balance
  );
END;
$$;
