-- Standardise address field naming across the platform
-- All address fields should use: address_line_1, address_line_2, postcode

-- partner_roasters: rename address_line1 → address_line_1, address_line2 → address_line_2
ALTER TABLE partner_roasters RENAME COLUMN address_line1 TO address_line_1;
ALTER TABLE partner_roasters RENAME COLUMN address_line2 TO address_line_2;

-- delivery_addresses: rename line1 → address_line_1, line2 → address_line_2, postal_code → postcode
ALTER TABLE delivery_addresses RENAME COLUMN line1 TO address_line_1;
ALTER TABLE delivery_addresses RENAME COLUMN line2 TO address_line_2;
ALTER TABLE delivery_addresses RENAME COLUMN postal_code TO postcode;
