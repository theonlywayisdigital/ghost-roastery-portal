-- Fix FK constraints that block hard-deleting a roaster.
-- Change NO ACTION → CASCADE so partner_roasters DELETE cascades cleanly.

-- 1. ghost_orders.roaster_id → partner_roasters (was NO ACTION)
ALTER TABLE ghost_orders
  DROP CONSTRAINT orders_roaster_id_fkey,
  ADD CONSTRAINT orders_roaster_id_fkey
    FOREIGN KEY (roaster_id) REFERENCES partner_roasters(id) ON DELETE CASCADE;

-- 2. orders.roaster_id → partner_roasters (was NO ACTION)
ALTER TABLE orders
  DROP CONSTRAINT wholesale_orders_roaster_id_fkey,
  ADD CONSTRAINT wholesale_orders_roaster_id_fkey
    FOREIGN KEY (roaster_id) REFERENCES partner_roasters(id) ON DELETE CASCADE;

-- 3. products.roaster_id → partner_roasters (was NO ACTION)
ALTER TABLE products
  DROP CONSTRAINT wholesale_products_roaster_id_fkey,
  ADD CONSTRAINT wholesale_products_roaster_id_fkey
    FOREIGN KEY (roaster_id) REFERENCES partner_roasters(id) ON DELETE CASCADE;

-- 4. roaster_orders.roaster_id → partner_roasters (was NO ACTION)
ALTER TABLE roaster_orders
  DROP CONSTRAINT roaster_orders_roaster_id_fkey,
  ADD CONSTRAINT roaster_orders_roaster_id_fkey
    FOREIGN KEY (roaster_id) REFERENCES partner_roasters(id) ON DELETE CASCADE;

-- 5. roaster_orders.order_id → ghost_orders (was NO ACTION — would block ghost_orders cascade)
ALTER TABLE roaster_orders
  DROP CONSTRAINT roaster_orders_order_id_fkey,
  ADD CONSTRAINT roaster_orders_order_id_fkey
    FOREIGN KEY (order_id) REFERENCES ghost_orders(id) ON DELETE CASCADE;

-- 6. ghost_roaster_applications.roaster_id → partner_roasters (was NO ACTION)
ALTER TABLE ghost_roaster_applications
  DROP CONSTRAINT ghost_roaster_applications_roaster_id_fkey,
  ADD CONSTRAINT ghost_roaster_applications_roaster_id_fkey
    FOREIGN KEY (roaster_id) REFERENCES partner_roasters(id) ON DELETE CASCADE;

-- 7. supply_orders.roaster_id → partner_roasters (was NO ACTION)
ALTER TABLE supply_orders
  DROP CONSTRAINT supply_orders_roaster_id_fkey,
  ADD CONSTRAINT supply_orders_roaster_id_fkey
    FOREIGN KEY (roaster_id) REFERENCES partner_roasters(id) ON DELETE CASCADE;

-- 8. user_roles.roaster_id → partner_roasters (was NO ACTION)
ALTER TABLE user_roles
  DROP CONSTRAINT user_roles_roaster_id_fkey,
  ADD CONSTRAINT user_roles_roaster_id_fkey
    FOREIGN KEY (roaster_id) REFERENCES partner_roasters(id) ON DELETE CASCADE;
