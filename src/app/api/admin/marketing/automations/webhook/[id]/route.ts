// Admin marketing automation webhook — re-exports roaster handlers.
// This route uses its own auth (external webhook), not getMarketingOwner().
export { POST } from "@/app/api/marketing/automations/webhook/[id]/route";
