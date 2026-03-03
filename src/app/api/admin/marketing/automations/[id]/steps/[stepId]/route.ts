// Admin marketing automation step detail — re-exports roaster handlers.
// getMarketingOwner() auto-detects admin context from the /api/admin/ URL path.
export { PUT, DELETE } from "@/app/api/marketing/automations/[id]/steps/[stepId]/route";
