-- =============================================================================
-- Drop orphaned database tables
-- =============================================================================
-- These tables have zero .from() calls in application code, zero server-side
-- references, and no active UI. They were created for features that were either
-- abandoned or superseded by other implementations.
--
-- Uses CASCADE to automatically drop dependent objects (triggers, policies, indexes).
-- =============================================================================

-- direct_messages depends on email_connections (FK connection_id), so drop it first
DROP TABLE IF EXISTS direct_messages CASCADE;
DROP TABLE IF EXISTS email_connections CASCADE;

-- Remaining tables have no inter-dependencies among themselves
DROP TABLE IF EXISTS delivery_addresses CASCADE;
DROP TABLE IF EXISTS storefront_events CASCADE;
DROP TABLE IF EXISTS template_leads CASCADE;
DROP TABLE IF EXISTS supply_orders CASCADE;
DROP TABLE IF EXISTS roaster_billing CASCADE;
DROP TABLE IF EXISTS ghost_roaster_applications CASCADE;
