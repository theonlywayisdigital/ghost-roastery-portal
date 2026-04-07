# Roaster Portal — Complete Feature & Dependency Audit

**Date:** 2026-04-07
**Purpose:** Full audit of every feature in the roaster portal. Identify what to keep for MVP, what to hide, and cascading effects. Reference document only — no changes proposed.

---

## Table of Contents

1. [Inventory](#1-inventory)
2. [Production Planner](#2-production-planner)
3. [Cupping Tool](#3-cupping-tool)
4. [Calculators / Pricing](#4-calculators--pricing)
5. [Certifications](#5-certifications)
6. [Products](#6-products)
7. [Orders](#7-orders)
8. [Wholesale Portal](#8-wholesale-portal)
9. [Contacts](#9-contacts)
10. [Invoices](#10-invoices)
11. [Campaigns (Email Marketing)](#11-campaigns-email-marketing)
12. [Content Calendar](#12-content-calendar)
13. [Social](#13-social)
14. [Automations](#14-automations)
15. [AI Studio](#15-ai-studio)
16. [Forms](#16-forms)
17. [Analytics](#17-analytics)
18. [Inbox](#18-inbox)
19. [Support](#19-support)
20. [Help Centre](#20-help-centre)
21. [Settings](#21-settings)
22. [Stripe — Complete Map](#22-stripe--complete-map)
23. [Email Sending — Complete Chain](#23-email-sending--complete-chain)
24. [Hidden Active Background Processes](#24-hidden-active-background-processes)
25. [Global Feature Flag](#25-global-feature-flag)
26. [Storefront (Public)](#26-storefront-public)

---

## 1. INVENTORY

**Nav location:** Roaster Tools suite → "Inventory" → `/tools/inventory`
**Sub-pages:** Green Beans (`/tools/inventory/green`), Roasted Stock (`/tools/inventory/roasted`), Roast Log (`/tools/inventory/roast-log`), Overview (`/tools/inventory`)
**Tier gate:** None — always visible. Limits: 3 green beans / 3 roasted stock / 10 roast logs per month on Free; 50/50/unlimited on Growth+

**Database tables:** `green_beans`, `green_bean_movements`, `roasted_stock`, `roasted_stock_movements`, `suppliers`

**API routes:**
- `/api/tools/green-beans/` + `[id]/` + `[id]/movements/`
- `/api/tools/roasted-stock/` + `[id]/` + `[id]/movements/`
- `/api/tools/inventory/overview/`, `/quick-data/`, `/import/`, `/settings/`

**Connects to:**
- Products (roasted_stock_id link on products)
- Production Planner (green_bean_id on production_plans)
- Calculators/Pricing (green_bean_id on cost_calculations)
- Analytics (inventory section reads green_beans + roasted_stock)
- Orders (stock deduction movements on order confirmation)
- Dashboard (low stock alerts — gated by `toolsLowStockAlerts`, Growth+ only)

**If hidden/removed:**
- Production Planner loses stock visibility
- Product form's stock linking fields would reference missing data
- Cost Calculator loses green bean cost lookups
- Dashboard low stock alerts stop
- Analytics inventory section empty
- Orders still work (stock deductions just wouldn't be tracked)

---

## 2. PRODUCTION PLANNER

**Nav location:** Roaster Tools suite → "Production" → `/tools/production`
**Tier gate:** `toolsProductionPlanner` feature flag — locked on Free tier

**Database tables:** `production_plans`, `roast_logs`

**API routes:** `/api/tools/production/` + `[id]/`

**Connects to:**
- Inventory (reads green_beans for available stock)
- Analytics (production section reads production_plans + roast_logs)

**If hidden/removed:**
- No cascading breaks — standalone planning tool
- Analytics production section would be empty
- Roast logs can still be created independently from Inventory

---

## 3. CUPPING TOOL

**Nav location:** Roaster Tools suite → "Cupping" → `/tools/cupping`
**Sub-pages:** List, New (`/tools/cupping/new`), Detail (`/tools/cupping/[id]`)
**Tier gate:** None — always visible. Limit: 2 sessions/month on Free, unlimited Growth+

**Database tables:** `cupping_sessions`, `cupping_samples`

**API routes:**
- `GET/POST /api/tools/cupping/` (list/create sessions)
- `GET/PUT/DELETE /api/tools/cupping/[id]/` (detail/update/delete)
- `GET/POST /api/tools/cupping/[id]/samples/` (manage samples)
- `GET/PUT/DELETE /api/tools/cupping/[id]/samples/[sampleId]/`

**Key fields:** session_date, session_name, cupper_name, notes, total_score

**Connects to:** Standalone tool. No hard dependencies on other features.

**If hidden/removed:** No cascading breaks. Pure quality assessment tool.

---

## 4. CALCULATORS / PRICING

**Nav location:** Roaster Tools suite → "Calculators" → `/tools/pricing`
**Sub-pages:** Overview (`/tools/pricing`), Cost Calculator (`/tools/pricing/calculator`), Break-even Calculator (`/tools/pricing/breakeven`)
**Tier gate:** Base always visible. Break-even gated by `toolsBreakeven` — locked on Free tier

**Database tables:** `cost_calculations`

**API routes:**
- `GET/POST /api/tools/pricing/` (list/create)
- `GET/PUT/DELETE /api/tools/pricing/[id]/` (detail/update/delete)

**Key fields:** name, green_bean_id, green_cost_per_kg, roast_loss_percent, labour_cost_per_hour, roast_time_minutes, packaging_cost_per_unit, label_cost_per_unit, overhead_per_unit, bag_weight_grams, target_retail_margin_percent, target_wholesale_margin_percent, product_id (optional), is_template

**Computed fields:** computed_cost_per_unit, calculated_retail_price, calculated_wholesale_price

**Connects to:**
- Inventory (green_bean_id FK for cost lookups)
- Products (product_id optional link)

**If hidden/removed:**
- No cascading breaks — standalone calculation tool
- Green bean cost data still exists in inventory

---

## 5. CERTIFICATIONS

**Nav location:** Roaster Tools suite → "Certifications" → `/tools/certifications`
**Sub-pages:** List, New (`/tools/certifications/new`), Detail (`/tools/certifications/[id]`)
**Tier gate:** None — always visible. Limit: 3 on Free, unlimited Growth+

**Database tables:** `certifications`

**API routes:**
- `GET/POST /api/tools/certifications/` (list/create)
- `GET/PUT/DELETE /api/tools/certifications/[id]/` (detail/update/delete)

**Key fields:** cert_name, cert_type, certificate_number, issuing_body, issue_date, expiry_date, status (computed: pending/active/expiring_soon/expired), reminder_days, document_url, document_name, notes

**Connects to:** Standalone document tracker. No hard dependencies.

**If hidden/removed:** No cascading breaks. Pure compliance tracking tool.

---

## 6. PRODUCTS

**Nav location:** Sales Suite → "Products" → `/products`
**Sub-pages:** List, New (`/products/new`), Detail/Edit (`/products/[id]`), Import (`/products/import`)
**Tier gate:** None — always visible. Limit: 3 products on Free, 20 Growth, 50 Pro, unlimited Scale

**Database tables:** `products`, `product_variants`, `product_images`, `blend_components`, `product_option_types`, `product_option_values`, `product_variant_option_values`, `roaster_grind_types`

**API routes:**
- `/api/products/` + `[id]/` + `[id]/images/` + `[id]/images/reorder/` + `[id]/channels/`
- `/api/products/import/` + `/import/template/`

**Connects to:**
- Orders (items reference product_id + variant_id)
- Storefront (product catalogue display)
- Wholesale Portal (wholesale pricing on variants)
- Ecommerce sync (product_channel_mappings to Shopify/WooCommerce/Squarespace/Wix)
- Inventory (roasted_stock_id, green_bean_id links)
- Calculators (product_id optional link on cost_calculations)
- Analytics (product sales data)

**If hidden/removed:**
- **CRITICAL** — entire transaction system breaks. No products = no orders = no revenue.
- Storefront empty, wholesale catalogue empty, ecommerce sync pointless

---

## 7. ORDERS

**Nav location:** Sales Suite → "Orders" → `/orders`
**Sub-pages:** List, Detail (`/orders/[id]`), New Manual Order (`/orders/new`), Create Invoice from Order (`/orders/[id]/create-invoice`)
**Tier gate:** None — always visible. Limit: 20 wholesale orders/month on Free

**Database tables:** `ghost_orders` (platform), `orders` (storefront/wholesale), `roaster_orders` (fulfilment junction), `order_activity_log`, `refunds`

**API routes:**
- `/api/orders/` + `[id]/` + `[id]/status/` + `[id]/cancel/` + `[id]/mark-paid/` + `[id]/activity/`
- `/api/orders/all/` (unified view), `/api/orders/ghost-roastery/` (platform only)
- `/api/orders/create-manual/`

**Connects to:**
- Products (item selection)
- Invoices (order_ids array on invoices)
- Contacts (contact_id on orders)
- Wholesale Portal (order_channel = 'wholesale')
- Analytics (revenue, order counts)
- Finance/Payouts (partner_payout_total on ghost_orders)
- Email (dispatch, delivery, cancellation notifications)
- Inventory (stock deduction movements)
- Support (tickets reference order_id)
- Dashboard (pending orders, revenue widgets, activity feed)

**If hidden/removed:**
- **CRITICAL** — core transaction layer. Everything downstream breaks.

---

## 8. WHOLESALE PORTAL

**Nav location:** Sales Suite → "Wholesale Portal" → `/wholesale-portal`
**Sub-pages:** Setup, Content, Products, Buyers, Settings, Embed
**Tier gate:** None — always visible. Limits: 5 wholesale accounts on Free, 50 Growth, 200 Pro, unlimited Scale

**Database tables:** `wholesale_access`, `buyer_addresses`

**API routes:**
- `/api/wholesale-buyers/` + `[id]/` + `[id]/addresses/` + `/import/` + `/settings/`
- `/api/s/wholesale-access/`, `/api/s/wholesale-apply/`
- `/api/wholesale-portal/stripe/connect`, `/api/wholesale-portal/stripe/status`

**Connects to:**
- Contacts (creates contact records for wholesale buyers)
- Businesses (creates business records)
- Orders (wholesale channel orders)
- Invoices (buyer_id / wholesale_access_id on invoices)
- Storefront wholesale pages (`/s/[slug]/wholesale/`)
- Stripe Connect (for receiving wholesale payments)
- Email (application received, approved, account setup emails)
- Dashboard (trade requests widget)

**If hidden/removed:**
- Wholesale ordering channel stops working
- Existing wholesale buyers can't place orders
- Wholesale application forms on storefronts break
- Invoice creation for wholesale orders loses buyer context

---

## 9. CONTACTS

**Nav location:** Sales Suite → "Contacts" → `/contacts`
**Sub-pages:** List (UnifiedCRM), Detail (`/contacts/[id]`), Import (`/contacts/import`), Pipeline (`/contacts/pipeline` — tier-gated)
**Tier gate:** None for base contacts. Pipeline locked on Free tier (`pipeline` + `customPipelineStages`). Limit: 100 contacts on Free, 1500 Growth, 5000 Pro, unlimited Scale

**Database tables:** `contacts`, `businesses`, `people`, `contact_activity`, `pipeline_stages`

**API routes:**
- `/api/contacts/` + `[id]/` + `[id]/notes/` + `[id]/activity/` + `/import/` + `/pipeline/`
- `/api/businesses/` + `[id]/` + `[id]/contacts/` + `[id]/notes/`

**Connects to:**
- Marketing campaigns (audience targeting by contact type/status)
- Wholesale Portal (wholesale buyers are contacts)
- Invoices (customer lookup)
- Forms (auto-creates contacts from submissions)
- Inbox (link emails to contacts)
- Accounting integrations (contact sync to Xero/Sage/QB)
- Dashboard (activity feed)

**If hidden/removed:**
- Campaigns can't target audiences — email marketing breaks
- Wholesale buyer creation breaks (they're contacts)
- Invoice customer lookups fail
- Form submissions can't auto-create contacts

---

## 10. INVOICES

**Nav location:** Sales Suite → "Invoices" → `/invoices`
**Sub-pages:** List, New, Detail, Edit
**Tier gate:** `invoices` feature flag — locked on Free tier

**Database tables:** `invoices`, `invoice_line_items`, `invoice_sequences`, `invoice_payments`

**API routes:**
- `/api/invoices/` + `[id]/` + `[id]/pdf/` + `[id]/send/` + `[id]/send-reminder/` + `[id]/record-payment/` + `[id]/void/`
- `/api/invoices/check-overdue/`
- `/api/my-invoices/` (customer-facing)

**Connects to:**
- Orders (order_ids array links invoices to orders)
- Contacts/Businesses (customer info)
- Stripe (payment links for online payment)
- Email (send invoice, reminders, payment confirmation — all via Resend)
- PDF generation (react-pdf)
- Accounting sync (Xero/Sage/QuickBooks — pushes invoices on creation/payment)
- Webhooks (dispatches invoice.created, invoice.paid events)
- Cron job (`/api/cron/check-overdue-invoices` — marks overdue, sends reminders)
- Dashboard (overdue invoices widget)

**If hidden/removed:**
- Wholesale buyers can't be billed via invoice
- Orders that require invoice payment break
- Accounting sync for invoices stops
- Cron job would still run but find no invoices to process

---

## 11. CAMPAIGNS (Email Marketing)

**Nav location:** Marketing Suite → "Campaigns" → `/marketing/campaigns`
**Sub-pages:** List, New, Edit, Report
**Tier gate:** None — always visible in nav. Email send limit: 500/month on Free, 5000 Growth, 15000 Pro, unlimited Scale

**Database tables:** `campaigns`, `campaign_recipients`, `campaign_analytics`

**API routes:**
- `/api/marketing/campaigns/` + `[id]/` + `[id]/send/` + `[id]/test/` + `[id]/report/`
- `/api/marketing/campaigns/process/` (background job for scheduled sends)
- `/api/marketing/templates/` (shared templates)

**Connects to:**
- Contacts (audience targeting)
- Resend (email delivery)
- Email templates + branding
- Custom email domain (sending domain)
- Analytics (campaign performance)
- Automations (automation steps can trigger campaign sends)

**If hidden/removed:**
- Email marketing stops
- Automation email steps break (automations trigger campaign sends)
- No cascading data issues — campaigns are self-contained

---

## 12. CONTENT CALENDAR

**Nav location:** Marketing Suite → "Content Calendar" → `/marketing` (exact match)
**Tier gate:** `contentCalendar` feature flag — locked on Free tier

**Database tables:** `calendar_entries`

**API routes:** `/api/marketing/calendar/`

**Connects to:** Standalone planning tool. No hard dependencies.

**If hidden/removed:** No cascading breaks. Pure planning UI.

---

## 13. SOCIAL

**Nav location:** Marketing Suite → "Social" → `/marketing/social`
**Sub-pages:** Dashboard, Compose, Detail
**Tier gate:** `socialScheduling` feature flag — locked on Free tier. Also: `integrationsSocial` gates Meta connections

**Database tables:** `social_posts`, `social_connections`

**API routes:**
- `/api/social/posts/` + `[id]/` + `[id]/reschedule/` + `/calendar/`
- `/api/social/publish/`, `/api/social/process/` (background job)
- `/api/social/connections/`, `/api/social/meta/auth/` + `/callback/` + `/disconnect/`
- `/api/social/analytics/`

**Connects to:**
- Meta/Facebook Graph API (OAuth + publishing)
- Media uploads

**If hidden/removed:** No cascading breaks. Self-contained feature.

---

## 14. AUTOMATIONS

**Nav location:** Marketing Suite → "Automations" → `/marketing/automations`
**Sub-pages:** List, New (`/marketing/automations/new`), AI Builder (`/marketing/automations/new/ai-builder`), Detail (`/marketing/automations/[id]`), Edit (`/marketing/automations/[id]/edit`), Triggers (`/marketing/automations/[id]/edit/triggers`)
**Tier gate:** `automations` feature flag — locked on Free tier

**Database tables:** `automations`, `automation_triggers`, `automation_steps`

**API routes:**
- `/api/marketing/automations/` + `[id]/`
- `/api/marketing/automations/process/` (background job for workflow execution)

**Components:** TriggerPicker, TriggerConfigEditor, FilterBuilder, EmailEditorSlideOver

**Connects to:**
- Campaigns (email send steps)
- Contacts (trigger conditions, audience filtering)
- AI Studio (automation AI planner — 5 credits)
- Background processing (`/api/marketing/automations/process/`)

**If hidden/removed:**
- Automated workflows stop executing
- Background process still fires but finds nothing to process
- No cascading data issues — automations are self-contained

---

## 15. AI STUDIO

**Nav location:** Marketing Suite → "AI Studio" → `/marketing/ai`
**Tier gate:** Limit-gated by `aiCreditsPerMonth` — 0 on Free (effectively locked), 150 Growth, 500 Pro, 1500 Scale

**Database tables:** None specific — uses AI credit tracking on roaster record

**API routes:** Uses AI endpoints inline (no dedicated API route directory)

**AI action types and credit costs:**
- **Light (1 credit):** email_subject, email_preview, email_body, social_caption, product_name, product_description, discount_description, form_description, website_heading, website_body, website_meta_title, website_meta_description
- **Special (2 credits):** extract_order
- **Medium (3 credits):** generate_email, generate_blog_post, compose_contact_email
- **Heavy (5 credits):** generate_automation, refine_automation, plan_campaign, plan_social, plan_automation, plan_ideas

**Studio sections:** Campaign Planner (5 credits), Social Planner (5 credits), Automation Planner (5 credits), Ideas Planner (5 credits)

**Connects to:**
- Automations (AI automation builder)
- Campaigns (AI campaign planner)
- Social (AI social planner)
- Inbox (extract_order uses 2 credits)

**If hidden/removed:**
- AI assistance unavailable across all features
- Features still work manually — AI is enhancement only
- No cascading data issues

---

## 16. FORMS

**Nav location:** Marketing Suite → "Forms" → `/marketing/forms`
**Sub-pages:** List, Edit, Submissions
**Tier gate:** None — always visible. Limit: 1 embedded form on Free, 10 Growth, unlimited Pro+. `formBrandingRemoved` (Growth+) removes "Powered by Roastery Platform" badge

**Database tables:** `forms`, `form_submissions`

**API routes:**
- `/api/marketing/forms/` + `[id]/` + `[id]/submissions/` + `[id]/export/`
- `/api/forms/[id]/render/` (public embeddable form)
- `/api/forms/[id]/submit/` (public submission endpoint)
- `/api/forms/embed/`

**Connects to:**
- Contacts (auto-creates contacts from submissions)
- Public embed (forms render on external websites)
- Dashboard (activity feed shows form submissions)

**If hidden/removed:**
- Embedded forms on external sites stop rendering/submitting
- Lead capture pipeline breaks
- Existing form embed codes become dead links

---

## 17. ANALYTICS

**Nav location:** Standalone top-level → "Analytics" → `/analytics`
**Sub-pages:** Overview, Sales, Customers, Inventory, Production
**Tier gate:** None for overview. `salesAnalyticsBasic`/`salesAnalyticsFull` and `marketingAnalyticsBasic`/`marketingAnalyticsFull` gate specific sections — all locked on Free tier

**Database tables:** Reads from ALL feature tables (orders, invoices, contacts, green_beans, roasted_stock, production_plans, roast_logs, campaigns)

**API routes:** `/api/analytics/` + `/export/csv/` + `/export/pdf/`

**Connects to:** Every other feature (read-only aggregation)

**If hidden/removed:** No cascading breaks — purely read-only. Dashboard still has its own summary widgets.

---

## 18. INBOX

**Nav location:** Bottom nav → "Inbox" → `/inbox` (with unread badge)
**Sub-pages:** List, Detail
**Tier gate:** None — always visible. Order extraction gated by `orderExtraction` (Growth+)

**Database tables:** `inbox_messages`

**API routes:**
- `/api/inbox/` + `[id]/` + `[id]/extract-order/` + `/link-contact/` + `/bulk/`
- `/api/webhooks/inbound-email/` (receives emails via Resend MX webhook)

**Connects to:**
- Contacts (link messages to contacts)
- Orders (extract order from email — uses 2 AI credits)
- Resend (inbound email webhook)

**If hidden/removed:**
- Inbound email processing still fires via webhook (hidden active process)
- Messages would accumulate with no way to view them
- Email-to-order extraction unavailable

---

## 19. SUPPORT

**Nav location:** Bottom nav → "Support" → `/support`
**Sub-pages:** Dashboard, Tickets list, New ticket, Ticket detail/chat
**Tier gate:** None — always visible

**Database tables:** `support_tickets`, `support_ticket_messages`, `support_ticket_history`

**API routes:**
- `/api/support/tickets/` + `[id]/` + `[id]/messages/`
- `/api/support/chat/`

**Connects to:**
- Orders (tickets can reference order_id for context)
- Users (ticket creator)

**If hidden/removed:** Roasters lose ability to contact support. No cascading data issues.

---

## 20. HELP CENTRE

**Nav location:** Bottom nav → "Help Centre" → `/help`
**Sub-pages:** Hub, Article viewer (`/help/[slug]`)
**Tier gate:** None — always visible

**Database tables:** `kb_categories`, `kb_articles`

**API routes:**
- `/api/support/kb/` + `[slug]/` + `[slug]/helpful/`

**Connects to:** Standalone. Admin manages articles; roasters read them.

**If hidden/removed:** No cascading breaks. Note: KB seed data not yet implemented.

---

## 21. SETTINGS

### 21a. Profile (`/settings/profile`)
- **Tables:** `users`, `profiles`
- **APIs:** `/api/settings/profile/`, `/password/`, `/photo/`, `/delete-account/`
- **If removed:** Users can't update name, password, photo. Auth still works.

### 21b. Business Info (`/settings/business`)
- **Tables:** `roasters` (business_name, address, email, phone, website, country)
- **APIs:** `/api/settings/business/`
- **If removed:** Roaster metadata frozen. Storefront branding uses this data.

### 21c. Branding (`/settings/branding`)
- **Tables:** `roasters` (brand_logo_url, brand_colour, brand_accent_colour, brand_button_style, brand_heading_font, brand_body_font, tagline)
- **APIs:** `/api/settings/branding/`
- **Connects to:** Storefront appearance, email templates (logo + colours), invoice PDF branding
- **If removed:** Branding frozen at current values. Storefront still renders.

### 21d. Billing (`/settings/billing`) — THREE TABS

- **Tab 1: "Subscription"** — Roaster's own subscription to Roastery Platform
  - Manages `sales_tier`, `marketing_tier`, `website_subscription_active`
  - Stripe Billing checkout sessions, cancellations, AI credit purchases
  - APIs: `/api/billing/create-checkout-session`, `/cancel-subscription`, `/buy-credits`, `/credits`, `/create-portal-session`

- **Tab 2: "My Billing"** — Roaster's own payment history & Stripe Connect redirect
  - Shows payout history, invoice history, VAT number, billing email
  - Stripe Connect section says "moved to Integrations" with link to `/settings/integrations?tab=payments`
  - APIs: `/api/settings/billing/`, `/payouts/`, `/invoices/`

- **Tab 3: "Customer Billing"** — How roaster invoices their customers
  - Invoice prefix, payment terms, currency, bank details
  - Auto-create/send invoices toggles, payment reminder settings
  - APIs: `/api/settings/billing/` (PUT for customer billing settings)

- **Why two billing areas:** Tab 1+2 = roaster paying US. Tab 3 = roaster billing THEIR customers. Stripe Connect setup lives on Integrations page.

### 21e. Email Templates (`/settings/email-templates`)
- **Tables:** `email_templates`
- **APIs:** `/api/settings/email-templates/`
- **If removed:** Custom email templates can't be edited. System defaults still work.

### 21f. Domain (`/settings/domain`)
- **Two parts:** Custom storefront domain + Custom email sending domain
- **Tables:** `roasters` (storefront_custom_domain), `roaster_email_domains`
- **APIs:** `/api/settings/email-domain/`, `/verify/`, `/api/website/domain/`, `/verify/`
- **Tier gate:** `customEmailDomain` (Growth+)
- **If removed:** Roasters stuck on default `roasteryplatform.com` subdomain. Emails send from `noreply@roasteryplatform.com`.

### 21g. Integrations (`/settings/integrations`)
- **Tabs/sections for:**
  - **Payments (Stripe Connect)** — receive wholesale/storefront payments
  - **Ecommerce** — Shopify, WooCommerce, Squarespace, Wix (product/order sync). Gated: `integrationsEcommerce` (Growth+)
  - **Accounting** — Xero, QuickBooks, Sage (invoice/payment sync). Gated: `integrationsAccounting` (Pro+)
  - **Social** — Meta/Instagram (social publishing). Gated: `integrationsSocial` (Growth+)
  - **Webhooks** — Custom webhook endpoints (redirected from `/settings/webhooks`)
- **Tables:** `ecommerce_connections`, `roaster_integrations`, `product_channel_mappings`, `roaster_webhooks`
- **APIs:** All `/api/integrations/*` routes (connect/callback/disconnect/status per provider)
- **If removed:** All external platform sync stops. Roasters can't connect Stripe to receive payments.

### 21h. Shipping (`/settings/shipping`)
- **Tables:** `shipping_methods`
- **APIs:** Shipping method CRUD
- **Connects to:** Orders (shipping method selection), Storefront checkout
- **If removed:** Shipping options frozen. Checkout may still use existing methods.

### 21i. Team (`/settings/team`)
- **Tables:** `user_team_memberships`, `team_invites`
- **Tier gate:** Limit: 1 on Free, 3 Growth, 5 Pro, 10 Scale
- **APIs:** Team member CRUD, invite management
- **If removed:** Single-user only. No team collaboration.

### 21j. Grind Types (`/settings/grind-types`)
- **Tables:** `roaster_grind_types`
- **Connects to:** Products (variant grind type options)
- **If removed:** Can't add/edit grind types. Existing product grind options still work.

### 21k. Security (`/settings/security`)
- MFA settings, password management
- **If removed:** Can't enable/disable MFA. Existing MFA still works.

### 21l. Notifications (`/settings/notifications`)
- **Tables:** `notification_settings`
- **If removed:** Notification preferences frozen at defaults.

### 21m. Pipeline Stages (`/settings/pipeline-stages`)
- **Tables:** `pipeline_stages`
- **Tier gate:** `customPipelineStages` (Growth+)
- **Connects to:** Contacts pipeline view
- **If removed:** Can't customise pipeline. Default stages still work.

---

## 22. STRIPE — COMPLETE MAP

### A. Stripe Billing (roaster pays Roastery Platform)
- **UI:** Settings → Billing → Subscription tab
- **What it does:** Manages roaster's own subscription tier (free/growth/pro/scale)
- **APIs:** `/api/billing/create-checkout-session`, `/cancel-subscription`, `/buy-credits`, `/credits`, `/create-portal-session`
- **Webhook:** `/api/webhooks/stripe-billing` — handles checkout.session.completed, subscription.updated, subscription.deleted, invoice.paid, invoice.payment_failed
- **Tables:** `roasters` (stripe_customer_id, stripe_sales_subscription_id, stripe_marketing_subscription_id, stripe_website_subscription_id, sales_tier, marketing_tier, subscription_status)
- **Background:** Grace period cron (`/api/cron/check-grace-periods`) downgrades tier after 14 days past_due

### B. Stripe Connect (roaster receives payments from customers)
- **UI:** Settings → Integrations → Payments tab
- **What it does:** Onboards roaster to Stripe Connect so they can accept wholesale/storefront payments
- **APIs:** `/api/wholesale-portal/stripe/connect`, `/api/wholesale-portal/stripe/status`
- **Tables:** `roasters` (stripe_account_id)

### C. Stripe Checkout (customers pay roasters)
- **UI:** Storefront checkout, wholesale checkout, invoice payment
- **APIs:** `/api/s/[slug]/checkout`, `/api/s/invoice-checkout`
- **Webhook:** `/api/webhooks/stripe-invoice-payment` — records payment, confirms orders, syncs to accounting

**Separation:** A is roaster-as-customer (paying for platform). B is roaster-as-merchant (receiving money). C is customer-as-buyer (paying roaster).

---

## 23. EMAIL SENDING — COMPLETE CHAIN

### Transactional Emails (platform-level)
- **From:** `Roastery Platform <noreply@roasteryplatform.com>` — hardcoded, no custom domain
- **Emails:** signup confirmation, password reset, partner allocation, admin notifications, welcome email
- **Sent via:** Resend API directly from `email.ts`

### Roaster-Branded Emails (customer-facing)
- **From:** `{roasterName} <{prefix}@{customDomain}>` OR `Roastery Platform <noreply@roasteryplatform.com>` fallback
- **Domain lookup:** `getVerifiedDomain(roasterId)` queries `roaster_email_domains` where `status = 'verified'`
- **Fallback:** If no custom domain → `roasteryplatform.com`
- **Emails:** order confirmation, dispatch, delivery, wholesale application received/approved/rejected, account setup, invoice, invoice reminder, invoice payment confirmation, order cancellation
- **Sent via:** Resend API with branding wrapper (`wrapEmailWithBranding`)

### Campaign/Marketing Emails
- **From:** `{fromName} <{prefix}@{customDomain}>` OR `{fromName} <noreply@roasteryplatform.com>` fallback
- **Same domain lookup** as roaster-branded
- **Batch size:** 50 per batch
- **Includes:** List-Unsubscribe header, unsubscribe token per recipient
- **Tracking:** Updates `campaign_recipients` status (sent/failed), Resend webhooks track delivered/opened/bounced/clicked
- **Sent via:** Resend API from `marketing-email.ts`
- **Monthly limits enforced:** 500 Free, 5000 Growth, 15000 Pro, unlimited Scale

### Invoice Emails specifically
- **From:** `{ownerName} <{prefix}@{customDomain}>` OR `Roastery Platform <noreply@roasteryplatform.com>`
- **Includes:** PDF attachment, Stripe payment link (if configured), line items table
- **Also sends:** reminder emails (via cron), payment confirmation emails (via Stripe webhook)

---

## 24. HIDDEN ACTIVE BACKGROUND PROCESSES

These run via webhooks/cron regardless of nav visibility:

1. **`/api/cron/check-overdue-invoices`** — Marks invoices overdue, sends reminder emails (if roaster enabled reminders)
2. **`/api/cron/check-grace-periods`** — Downgrades roaster tier to Free after 14-day payment failure grace period
3. **`/api/webhooks/stripe-billing`** — Processes all subscription lifecycle events
4. **`/api/webhooks/stripe-invoice-payment`** — Records payments, confirms orders, syncs to accounting (Xero/Sage/QB)
5. **`/api/webhooks/inbound-email`** — Receives inbound emails from Resend MX, stores in inbox_messages
6. **`/api/webhooks/shopify`** — Receives Shopify order/product webhooks
7. **`/api/webhooks/woocommerce`** — Receives WooCommerce webhooks
8. **`/api/webhooks/wix`** — Receives Wix webhooks
9. **`/api/webhooks/squarespace`** — Receives Squarespace webhooks
10. **`/api/marketing/campaigns/process`** — Processes scheduled campaign sends
11. **`/api/social/process`** — Processes scheduled social posts
12. **`/api/marketing/automations/process`** — Processes automation workflows

---

## 25. GLOBAL FEATURE FLAG

```typescript
// /src/lib/feature-flags.ts
export const RETAIL_ENABLED = false;
```

**Currently hides:**
- Discount Codes nav item in Marketing Suite
- Blog nav item in Marketing Suite
- Website Suite (even with website subscription active)

**Does NOT hide:**
- Storefront pages still accessible at `/s/[slug]/`
- Checkout still works
- All other features unaffected

---

## 26. STOREFRONT (Public)

**Base URL:** `/s/[slug]/`

### Core Pages
- `/s/[slug]` — Home page
- `/s/[slug]/shop` — Shop listing
- `/s/[slug]/shop/product/[id]` — Product detail
- `/s/[slug]/checkout` — Cart checkout
- `/s/[slug]/contact` — Contact form
- `/s/[slug]/success` — Order success

### Customer Account Pages
- `/s/[slug]/login` — Customer login
- `/s/[slug]/register` — Customer registration
- `/s/[slug]/account` — Customer account
- `/s/[slug]/setup-password` — Password setup (invited users)
- `/s/[slug]/orders` — Customer order history
- `/s/[slug]/orders/[id]` — Order detail

### Wholesale Pages
- `/s/[slug]/wholesale` — Wholesale listing
- `/s/[slug]/wholesale/product/[id]` — Wholesale product detail
- `/s/[slug]/wholesale/apply` — Wholesale application form
- `/s/[slug]/wholesale/login` — Wholesale buyer login
- `/s/[slug]/wholesale/checkout` — Wholesale checkout
- `/s/[slug]/wholesale/success` — Wholesale order success

### Embedded Components
- `/s/[slug]/embed/shop` — Embedded shop widget
- `/s/[slug]/embed/wholesale-apply` — Embedded wholesale apply form

**Connects to:** Products, Orders, Wholesale Portal, Contacts, Stripe Checkout, Branding, Domain settings

---

## APPENDIX: COMPLETE TIER LIMITS REFERENCE

### Sales Suite Limits
| Limit | Free | Growth | Pro | Scale |
|-------|------|--------|-----|-------|
| products | 3 | 20 | 50 | unlimited |
| wholesaleOrdersPerMonth | 20 | 400 | 800 | unlimited |
| wholesaleAccounts | 5 | 50 | 200 | unlimited |
| crmContacts | 100 | 1,500 | 5,000 | unlimited |
| teamMembers | 1 | 3 | 5 | 10 |

### Tools Suite Limits (via Sales tier)
| Limit | Free | Growth | Pro | Scale |
|-------|------|--------|-----|-------|
| greenBeans | 3 | 50 | unlimited | unlimited |
| roastedStock | 3 | 50 | unlimited | unlimited |
| roastLogsPerMonth | 10 | unlimited | unlimited | unlimited |
| cuppingSessionsPerMonth | 2 | unlimited | unlimited | unlimited |
| certifications | 3 | unlimited | unlimited | unlimited |

### Marketing Suite Limits
| Limit | Free | Growth | Pro | Scale |
|-------|------|--------|-----|-------|
| emailSendsPerMonth | 500 | 5,000 | 15,000 | unlimited |
| embeddedForms | 1 | 10 | unlimited | unlimited |
| aiCreditsPerMonth | 0 | 150 | 500 | 1,500 |

### Sales Suite Feature Flags
| Feature | Free | Growth | Pro | Scale |
|---------|------|--------|-----|-------|
| invoices | no | yes | yes | yes |
| pipeline | no | yes | yes | yes |
| customPipelineStages | no | yes | yes | yes |
| salesAnalyticsBasic | no | yes | yes | yes |
| salesAnalyticsFull | no | yes | yes | yes |
| crmEmailIntegration | no | yes | yes | yes |
| customEmailDomain | no | yes | yes | yes |
| integrationsEcommerce | no | yes | yes | yes |
| integrationsAccounting | no | no | yes | yes |
| orderExtraction | no | yes | yes | yes |

### Marketing Suite Feature Flags
| Feature | Free | Growth | Pro | Scale |
|---------|------|--------|-----|-------|
| contentCalendar | no | yes | yes | yes |
| socialScheduling | no | yes | yes | yes |
| automations | no | yes | yes | yes |
| marketingAnalyticsBasic | no | yes | yes | yes |
| marketingAnalyticsFull | no | yes | yes | yes |
| formBrandingRemoved | no | yes | yes | yes |
| integrationsSocial | no | yes | yes | yes |

### Tools Suite Feature Flags (via Sales tier)
| Feature | Free | Growth | Pro | Scale |
|---------|------|--------|-----|-------|
| toolsProductionPlanner | no | yes | yes | yes |
| toolsBreakeven | no | yes | yes | yes |
| toolsLowStockAlerts | no | yes | yes | yes |

### Pricing (monthly / annual per-month)
- **Sales Suite:** Free: £0 | Growth: £39/£33 | Pro: £79/£66 | Scale: £129/£108
- **Marketing Suite:** Free: £0 | Growth: £29/£24 | Pro: £59/£49 | Scale: £99/£83
- **Website:** £19/£16 (single tier)
- **Platform Fee:** 0% + £0 (no platform fee)
