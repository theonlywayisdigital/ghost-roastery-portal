-- Add notes column to orders table for delivery instructions / special requests
ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes text;
