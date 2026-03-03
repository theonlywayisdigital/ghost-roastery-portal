// Admin marketing discount code redemptions — re-exports roaster handlers.
// getMarketingOwner() auto-detects admin context from the /api/admin/ URL path.
export { GET } from "@/app/api/marketing/discount-codes/[id]/redemptions/route";
