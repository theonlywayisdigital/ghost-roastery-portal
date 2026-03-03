// Admin marketing discount codes — re-exports roaster handlers.
// getMarketingOwner() auto-detects admin context from the /api/admin/ URL path.
export { GET, POST } from "@/app/api/marketing/discount-codes/route";
