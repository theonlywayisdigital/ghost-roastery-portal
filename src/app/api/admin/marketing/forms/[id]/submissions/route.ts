// Admin marketing form submissions — re-exports roaster handlers.
// getMarketingOwner() auto-detects admin context from the /api/admin/ URL path.
export { GET } from "@/app/api/marketing/forms/[id]/submissions/route";
