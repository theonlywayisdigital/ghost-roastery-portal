// Admin marketing automation trigger (fire) — re-exports roaster handlers.
// This route does not use getMarketingOwner() — it accepts roaster_id in the body.
export { POST } from "@/app/api/marketing/automations/trigger/route";
