-- Migration: Unify variant option types for all product categories
-- Adds is_weight flag to option types and weight_grams to option values,
-- then migrates existing coffee products to use option types.

-- 1A. Schema changes
ALTER TABLE product_option_types
  ADD COLUMN IF NOT EXISTS is_weight boolean NOT NULL DEFAULT false;

ALTER TABLE product_option_values
  ADD COLUMN IF NOT EXISTS weight_grams integer;

-- 1B. Data migration — existing coffee products
-- Creates option types from existing weight_grams and grind_type_id on variants
DO $$
DECLARE
  prod RECORD;
  wt_type_id uuid;
  grind_type_id_local uuid;
  wt_val RECORD;
  grind_val RECORD;
  opt_val_id uuid;
  var_rec RECORD;
  weight_label text;
BEGIN
  -- Loop over coffee products that have variants but no option types yet
  FOR prod IN
    SELECT DISTINCT p.id AS product_id, p.roaster_id
    FROM products p
    JOIN product_variants pv ON pv.product_id = p.id
    WHERE p.category = 'coffee'
      AND NOT EXISTS (
        SELECT 1 FROM product_option_types pot
        WHERE pot.product_id = p.id
      )
  LOOP
    -- Weight option type
    IF EXISTS (
      SELECT 1 FROM product_variants
      WHERE product_id = prod.product_id AND weight_grams IS NOT NULL
    ) THEN
      wt_type_id := gen_random_uuid();
      INSERT INTO product_option_types (id, product_id, roaster_id, name, sort_order, is_weight)
      VALUES (wt_type_id, prod.product_id, prod.roaster_id, 'Weight', 0, true);

      -- Create option values for each distinct weight
      FOR wt_val IN
        SELECT DISTINCT weight_grams
        FROM product_variants
        WHERE product_id = prod.product_id AND weight_grams IS NOT NULL
        ORDER BY weight_grams
      LOOP
        opt_val_id := gen_random_uuid();

        -- Format weight label
        IF wt_val.weight_grams >= 1000 AND wt_val.weight_grams % 1000 = 0 THEN
          weight_label := (wt_val.weight_grams / 1000)::text || 'kg';
        ELSE
          weight_label := wt_val.weight_grams::text || 'g';
        END IF;

        INSERT INTO product_option_values (id, option_type_id, product_id, roaster_id, value, sort_order, weight_grams)
        VALUES (
          opt_val_id,
          wt_type_id,
          prod.product_id,
          prod.roaster_id,
          weight_label,
          wt_val.weight_grams, -- sort by grams
          wt_val.weight_grams
        );

        -- Create junction rows for variants with this weight
        FOR var_rec IN
          SELECT id FROM product_variants
          WHERE product_id = prod.product_id AND weight_grams = wt_val.weight_grams
        LOOP
          INSERT INTO product_variant_option_values (variant_id, option_value_id)
          VALUES (var_rec.id, opt_val_id)
          ON CONFLICT (variant_id, option_value_id) DO NOTHING;
        END LOOP;
      END LOOP;
    END IF;

    -- Grind option type
    IF EXISTS (
      SELECT 1 FROM product_variants
      WHERE product_id = prod.product_id AND grind_type_id IS NOT NULL
    ) THEN
      grind_type_id_local := gen_random_uuid();
      INSERT INTO product_option_types (id, product_id, roaster_id, name, sort_order, is_weight)
      VALUES (grind_type_id_local, prod.product_id, prod.roaster_id, 'Grind', 1, false);

      -- Create option values for each distinct grind type
      FOR grind_val IN
        SELECT DISTINCT pv.grind_type_id AS gt_id, gt.name AS gt_name
        FROM product_variants pv
        JOIN roaster_grind_types gt ON gt.id = pv.grind_type_id
        WHERE pv.product_id = prod.product_id AND pv.grind_type_id IS NOT NULL
        ORDER BY gt.name
      LOOP
        opt_val_id := gen_random_uuid();

        INSERT INTO product_option_values (id, option_type_id, product_id, roaster_id, value, sort_order)
        VALUES (
          opt_val_id,
          grind_type_id_local,
          prod.product_id,
          prod.roaster_id,
          grind_val.gt_name,
          0
        );

        -- Create junction rows for variants with this grind type
        FOR var_rec IN
          SELECT id FROM product_variants
          WHERE product_id = prod.product_id AND grind_type_id = grind_val.gt_id
        LOOP
          INSERT INTO product_variant_option_values (variant_id, option_value_id)
          VALUES (var_rec.id, opt_val_id)
          ON CONFLICT (variant_id, option_value_id) DO NOTHING;
        END LOOP;
      END LOOP;
    END IF;
  END LOOP;
END;
$$;

NOTIFY pgrst, 'reload schema';
