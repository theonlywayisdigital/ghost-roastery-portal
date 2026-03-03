// Admin marketing campaigns — re-exports roaster handlers.
// getMarketingOwner() auto-detects admin context from the /api/admin/ URL path.
export { GET, POST } from "@/app/api/marketing/campaigns/route";
