// Admin marketing form submission detail — re-exports roaster handlers.
// getMarketingOwner() auto-detects admin context from the /api/admin/ URL path.
export { DELETE } from "@/app/api/marketing/forms/[id]/submissions/[subId]/route";
