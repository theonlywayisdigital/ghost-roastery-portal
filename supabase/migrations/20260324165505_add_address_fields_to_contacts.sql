-- Add address fields to contacts table (matching businesses table column names)
ALTER TABLE contacts ADD COLUMN address_line_1 text;
ALTER TABLE contacts ADD COLUMN address_line_2 text;
ALTER TABLE contacts ADD COLUMN city text;
ALTER TABLE contacts ADD COLUMN county text;
ALTER TABLE contacts ADD COLUMN postcode text;
ALTER TABLE contacts ADD COLUMN country text NOT NULL DEFAULT 'GB';
