-- ══════════════════════════════════════════════════════════════
-- Fix orphaned green bean deductions
-- Finds green_bean_movements with movement_type = 'roast_deduction'
-- and reference_type = 'roast_log' where NO matching
-- roasted_stock_movements exists for the same reference_id.
-- Reverses each by adding back the deducted amount.
-- ══════════════════════════════════════════════════════════════

DO $$
DECLARE
  rec RECORD;
  v_new_balance decimal;
BEGIN
  FOR rec IN
    SELECT gbm.id, gbm.roaster_id, gbm.green_bean_id,
           gbm.quantity_kg, gbm.reference_id
    FROM green_bean_movements gbm
    WHERE gbm.movement_type = 'roast_deduction'
      AND gbm.reference_type = 'roast_log'
      AND NOT EXISTS (
        SELECT 1 FROM roasted_stock_movements rsm
        WHERE rsm.reference_id = gbm.reference_id
          AND rsm.reference_type = 'roast_log'
          AND rsm.movement_type = 'roast_addition'
      )
  LOOP
    -- quantity_kg is negative for deductions, so subtracting it adds back
    UPDATE green_beans
      SET current_stock_kg = current_stock_kg - rec.quantity_kg
    WHERE id = rec.green_bean_id
      AND roaster_id = rec.roaster_id
    RETURNING current_stock_kg INTO v_new_balance;

    IF v_new_balance IS NOT NULL THEN
      INSERT INTO green_bean_movements (
        roaster_id, green_bean_id, movement_type, quantity_kg,
        balance_after_kg, reference_id, reference_type, notes
      ) VALUES (
        rec.roaster_id, rec.green_bean_id, 'adjustment',
        -rec.quantity_kg, -- positive: reversal of negative deduction
        v_new_balance, rec.reference_id, 'roast_log',
        'Auto-fix: Reversed orphaned roast deduction (no matching roasted stock credit)'
      );
    END IF;
  END LOOP;
END;
$$;
