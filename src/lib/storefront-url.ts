/**
 * Generate a buyer-facing storefront URL using the roaster's subdomain.
 *
 * In production: https://{slug}.roasteryplatform.com{path}
 * In development: {NEXT_PUBLIC_PORTAL_URL}/s/{slug}{path}  (subdomains don't work on localhost)
 */
export function getStorefrontUrl(slug: string, path: string = ""): string {
  if (process.env.NODE_ENV !== "production") {
    const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL || "http://localhost:3001";
    return `${portalUrl}/s/${slug}${path}`;
  }

  const baseDomain = process.env.STOREFRONT_BASE_DOMAIN || "roasteryplatform.com";
  return `https://${slug}.${baseDomain}${path}`;
}
