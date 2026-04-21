-- Add scheduled_dispatch_date to orders table for dispatch planner
ALTER TABLE orders ADD COLUMN IF NOT EXISTS scheduled_dispatch_date date;
