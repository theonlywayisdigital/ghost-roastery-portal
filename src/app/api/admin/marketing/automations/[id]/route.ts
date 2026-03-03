// Admin marketing automation detail — re-exports roaster handlers.
// getMarketingOwner() auto-detects admin context from the /api/admin/ URL path.
export { GET, PUT, DELETE } from "@/app/api/marketing/automations/[id]/route";
