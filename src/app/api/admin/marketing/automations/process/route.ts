// Admin marketing automation process (cron) — re-exports roaster handlers.
// This route uses cron secret auth, not getMarketingOwner().
export { POST } from "@/app/api/marketing/automations/process/route";
