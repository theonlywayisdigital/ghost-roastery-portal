-- Migration: address_required_on_signup
-- No schema change. delivery_addresses table already exists.
-- This migration documents the flow change: customer account creation
-- now requires a delivery address before completing.
-- The address is saved to delivery_addresses with is_default: true
-- and used for the current order + Ghost Roaster routing.

SELECT 1;
