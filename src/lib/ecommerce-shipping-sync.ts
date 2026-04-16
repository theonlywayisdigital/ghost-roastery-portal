import { createServerClient } from "@/lib/supabase";

/**
 * Push the roaster's active shipping methods to all connected ecommerce channels.
 *
 * Supported platforms:
 * - Shopify: Creates/updates shipping zones and flat-rate methods via GraphQL Admin API
 * - WooCommerce: Creates/updates shipping zones and flat_rate methods via REST API
 *
 * Unsupported platforms (no shipping rate API):
 * - Wix: Only supports a callback SPI (getRates) — requires hosting a permanent service
 *         endpoint. Static flat rates cannot be pushed. Roasters must configure shipping
 *         manually in the Wix dashboard or install a Wix App Market shipping app.
 * - Squarespace: Has no shipping rate management API whatsoever. Roasters must configure
 *                shipping rates manually in the Squarespace dashboard.
 *
 * Call this after any shipping method create/update/delete, and during initial
 * storefront connection to seed the external store with the roaster's rates.
 */
export async function pushShippingToChannels(
  roasterId: string
): Promise<void> {
  const supabase = createServerClient();

  // Fetch the roaster's active shipping methods
  const { data: methods } = await supabase
    .from("shipping_methods")
    .select("id, name, price, free_threshold, estimated_days, max_weight_kg, is_active")
    .eq("roaster_id", roasterId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  const shippingMethods = methods || [];

  // Fetch all active ecommerce connections for this roaster
  const { data: connections } = await supabase
    .from("ecommerce_connections")
    .select("id, provider, store_url, access_token, api_secret, is_active, settings")
    .eq("roaster_id", roasterId)
    .eq("is_active", true);

  if (!connections || connections.length === 0) return;

  for (const conn of connections) {
    try {
      if (conn.provider === "shopify") {
        await pushShippingToShopify(conn, shippingMethods);
      } else if (conn.provider === "woocommerce") {
        await pushShippingToWooCommerce(conn, shippingMethods);
      }
      // Wix: Shipping rates cannot be pushed via API — Wix uses a callback SPI model
      // where the platform calls your endpoint at checkout. Static rates are not supported.
      // Squarespace: No shipping rate management API exists. Roasters must configure
      // shipping rates manually in the Squarespace Commerce dashboard.
    } catch (err) {
      console.error(
        `[shipping-sync] Failed to push shipping to ${conn.provider} (${conn.store_url}):`,
        err
      );
    }
  }
}

// ─── Shopify shipping push ─────────────────────────────────────────────
//
// Uses the GraphQL Admin API to update the General delivery profile.
// Requires the `write_shipping` OAuth scope.
//
// Strategy:
// 1. Query the General delivery profile to get its ID and existing zones
// 2. Delete all existing zones managed by us (identified by name prefix)
// 3. Create a single "Domestic" zone with all the roaster's shipping methods as flat rates
//
// We use a single zone with multiple rate definitions rather than one zone
// per method, because Shopify delivery profiles are zone-based (geographic)
// while our shipping methods are rate-based (flat rate per method).

interface ShippingMethod {
  id: string;
  name: string;
  price: number;
  free_threshold: number | null;
  estimated_days: string | null;
  max_weight_kg: number | null;
  is_active: boolean;
}

const MANAGED_ZONE_PREFIX = "RP: ";

async function pushShippingToShopify(
  conn: { store_url: string; access_token: string },
  methods: ShippingMethod[]
): Promise<void> {
  const graphqlUrl = `https://${conn.store_url}/admin/api/2024-01/graphql.json`;
  const headers = {
    "X-Shopify-Access-Token": conn.access_token,
    "Content-Type": "application/json",
  };

  // 1. Query the General delivery profile
  const profileQuery = `{
    deliveryProfiles(first: 1) {
      edges {
        node {
          id
          name
          profileLocationGroups {
            locationGroup {
              id
            }
            locationGroupZones(first: 50) {
              edges {
                node {
                  zone {
                    id
                    name
                  }
                  methodDefinitions(first: 50) {
                    edges {
                      node {
                        id
                        name
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }`;

  const profileRes = await fetch(graphqlUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({ query: profileQuery }),
  });

  if (!profileRes.ok) {
    console.error("[shipping-sync] Shopify GraphQL query failed:", profileRes.status);
    return;
  }

  const profileData = await profileRes.json();
  const profile = profileData.data?.deliveryProfiles?.edges?.[0]?.node;

  if (!profile) {
    console.error("[shipping-sync] No Shopify delivery profile found");
    return;
  }

  const profileId = profile.id;
  const locationGroups = profile.profileLocationGroups || [];

  if (locationGroups.length === 0) {
    console.error("[shipping-sync] No location groups in Shopify delivery profile");
    return;
  }

  const locationGroup = locationGroups[0];
  const locationGroupId = locationGroup.locationGroup.id;
  const existingZones = locationGroup.locationGroupZones?.edges || [];

  // 2. Find zones managed by us (prefixed with "RP: ")
  const managedZoneIds = existingZones
    .filter((e: { node: { zone: { name: string } } }) =>
      e.node.zone.name.startsWith(MANAGED_ZONE_PREFIX)
    )
    .map((e: { node: { zone: { id: string } } }) => e.node.zone.id);

  // 3. Build the update mutation
  // Delete our managed zones and create new ones with current methods
  const zonesToDelete = managedZoneIds;

  const zonesToCreate = methods.length > 0
    ? [
        {
          name: `${MANAGED_ZONE_PREFIX}Shipping`,
          countries: [{ code: "GB", includeAllProvinces: true }],
          methodDefinitionsToCreate: methods.map((m) => ({
            name: m.name,
            active: true,
            rateDefinition: {
              price: {
                amount: m.price,
                currencyCode: "GBP",
              },
            },
          })),
        },
      ]
    : [];

  const mutation = `mutation deliveryProfileUpdate($id: ID!, $profile: DeliveryProfileInput!) {
    deliveryProfileUpdate(id: $id, profile: $profile) {
      profile {
        id
      }
      userErrors {
        field
        message
      }
    }
  }`;

  const variables = {
    id: profileId,
    profile: {
      locationGroupsToUpdate: [
        {
          id: locationGroupId,
          zonesToDelete,
          zonesToCreate,
        },
      ],
    },
  };

  const mutationRes = await fetch(graphqlUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({ query: mutation, variables }),
  });

  if (!mutationRes.ok) {
    const errText = await mutationRes.text();
    console.error("[shipping-sync] Shopify shipping update failed:", errText);
    return;
  }

  const mutationData = await mutationRes.json();
  const userErrors = mutationData.data?.deliveryProfileUpdate?.userErrors;

  if (userErrors && userErrors.length > 0) {
    console.error("[shipping-sync] Shopify shipping update errors:", userErrors);
  } else {
    console.log(
      `[shipping-sync] Shopify shipping updated: ${methods.length} method(s) pushed to ${conn.store_url}`
    );
  }
}

// ─── WooCommerce shipping push ──────────────────────────────────────────
//
// Uses the WooCommerce REST API v3 to manage shipping zones and methods.
//
// Strategy:
// 1. List existing shipping zones to find any managed by us (name prefix "RP: ")
// 2. Delete existing managed zones (and their methods)
// 3. Create a new zone with the roaster's shipping methods as flat_rate instances
//
// Each GR shipping method becomes a flat_rate instance within a single zone.
// We use zone name prefix "RP: " to identify our managed zones.

async function pushShippingToWooCommerce(
  conn: { store_url: string; access_token: string; api_secret: string },
  methods: ShippingMethod[]
): Promise<void> {
  const baseUrl = `https://${conn.store_url}/wp-json/wc/v3`;
  const authHeader = Buffer.from(
    `${conn.access_token}:${conn.api_secret}`
  ).toString("base64");
  const headers = {
    Authorization: `Basic ${authHeader}`,
    "Content-Type": "application/json",
  };

  // 1. List existing zones
  const zonesRes = await fetch(`${baseUrl}/shipping/zones`, { headers });
  if (!zonesRes.ok) {
    console.error("[shipping-sync] WooCommerce zones list failed:", zonesRes.status);
    return;
  }

  const zones: { id: number; name: string }[] = await zonesRes.json();

  // 2. Delete zones managed by us
  for (const zone of zones) {
    if (zone.name.startsWith(MANAGED_ZONE_PREFIX) && zone.id !== 0) {
      await fetch(`${baseUrl}/shipping/zones/${zone.id}?force=true`, {
        method: "DELETE",
        headers,
      });
    }
  }

  // 3. If no methods, we're done — just cleaned up
  if (methods.length === 0) {
    console.log(`[shipping-sync] WooCommerce shipping cleared on ${conn.store_url}`);
    return;
  }

  // 4. Create a new managed zone
  const createZoneRes = await fetch(`${baseUrl}/shipping/zones`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: `${MANAGED_ZONE_PREFIX}Shipping`,
      order: 0,
    }),
  });

  if (!createZoneRes.ok) {
    const errText = await createZoneRes.text();
    console.error("[shipping-sync] WooCommerce zone create failed:", errText);
    return;
  }

  const newZone: { id: number } = await createZoneRes.json();

  // 5. Set zone locations (UK by default)
  await fetch(`${baseUrl}/shipping/zones/${newZone.id}/locations`, {
    method: "PUT",
    headers,
    body: JSON.stringify([{ code: "GB", type: "country" }]),
  });

  // 6. Add each shipping method as a flat_rate instance
  for (const method of methods) {
    // Create the flat_rate method instance
    const methodRes = await fetch(
      `${baseUrl}/shipping/zones/${newZone.id}/methods`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ method_id: "flat_rate" }),
      }
    );

    if (!methodRes.ok) continue;

    const instance: { instance_id: number } = await methodRes.json();

    // Update the instance with name and cost
    await fetch(
      `${baseUrl}/shipping/zones/${newZone.id}/methods/${instance.instance_id}`,
      {
        method: "PUT",
        headers,
        body: JSON.stringify({
          enabled: true,
          settings: {
            title: method.name,
            cost: method.price.toFixed(2),
          },
        }),
      }
    );
  }

  console.log(
    `[shipping-sync] WooCommerce shipping updated: ${methods.length} method(s) pushed to ${conn.store_url}`
  );
}
