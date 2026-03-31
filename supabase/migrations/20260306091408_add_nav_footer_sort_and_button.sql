ALTER TABLE website_pages ADD COLUMN nav_sort_order integer NOT NULL DEFAULT 0;
ALTER TABLE website_pages ADD COLUMN footer_sort_order integer NOT NULL DEFAULT 0;
ALTER TABLE website_pages ADD COLUMN is_nav_button boolean NOT NULL DEFAULT false;

-- Seed nav_sort_order and footer_sort_order from existing sort_order
UPDATE website_pages SET nav_sort_order = sort_order, footer_sort_order = sort_order;
