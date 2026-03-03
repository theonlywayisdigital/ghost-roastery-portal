// Admin marketing automation steps — re-exports roaster handlers.
// getMarketingOwner() auto-detects admin context from the /api/admin/ URL path.
export { GET, POST } from "@/app/api/marketing/automations/[id]/steps/route";
