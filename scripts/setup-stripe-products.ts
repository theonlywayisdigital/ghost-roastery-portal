/**
 * One-time script to create Stripe Products and Prices for Roastery Platform subscriptions.
 *
 * Run: npx tsx scripts/setup-stripe-products.ts
 *
 * Creates:
 *  - 2 Products: "Sales Suite" and "Marketing Suite"
 *  - 12 Prices: 3 paid tiers × 2 billing cycles × 2 products
 *
 * Copy the output Price IDs into src/lib/tier-config.ts → STRIPE_PRICE_IDS
 */

import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

type TierLevel = "growth" | "pro" | "scale";

const TIERS: TierLevel[] = ["growth", "pro", "scale"];

// Prices in pence
const SALES_PRICING: Record<TierLevel, { monthly: number; annual: number }> = {
  growth: { monthly: 3900, annual: 3300 },
  pro: { monthly: 7900, annual: 6600 },
  scale: { monthly: 12900, annual: 10800 },
};

const MARKETING_PRICING: Record<TierLevel, { monthly: number; annual: number }> = {
  growth: { monthly: 1900, annual: 1600 },
  pro: { monthly: 3900, annual: 3300 },
  scale: { monthly: 6900, annual: 5800 },
};

async function main() {
  console.log("Creating Stripe Products and Prices...\n");

  // Create Products
  const salesProduct = await stripe.products.create({
    name: "Roastery Platform — Sales Suite",
    description: "CRM, wholesale management, invoicing, and sales analytics for coffee roasters.",
    metadata: { product_type: "sales" },
  });
  console.log(`Sales Product: ${salesProduct.id}`);

  const marketingProduct = await stripe.products.create({
    name: "Roastery Platform — Marketing Suite",
    description: "Email campaigns, social scheduling, automations, and marketing analytics.",
    metadata: { product_type: "marketing" },
  });
  console.log(`Marketing Product: ${marketingProduct.id}\n`);

  // Create Prices
  const results: Record<string, Record<string, { monthly: string; annual: string }>> = {
    sales: {},
    marketing: {},
  };

  for (const tier of TIERS) {
    // Sales prices
    const salesMonthly = await stripe.prices.create({
      product: salesProduct.id,
      unit_amount: SALES_PRICING[tier].monthly,
      currency: "gbp",
      recurring: { interval: "month" },
      metadata: { product_type: "sales", tier, billing_cycle: "monthly" },
      nickname: `Sales Suite — ${tier.charAt(0).toUpperCase() + tier.slice(1)} (Monthly)`,
    });

    const salesAnnual = await stripe.prices.create({
      product: salesProduct.id,
      unit_amount: SALES_PRICING[tier].annual * 12, // annual total
      currency: "gbp",
      recurring: { interval: "year" },
      metadata: { product_type: "sales", tier, billing_cycle: "annual" },
      nickname: `Sales Suite — ${tier.charAt(0).toUpperCase() + tier.slice(1)} (Annual)`,
    });

    results.sales[tier] = { monthly: salesMonthly.id, annual: salesAnnual.id };

    // Marketing prices
    const marketingMonthly = await stripe.prices.create({
      product: marketingProduct.id,
      unit_amount: MARKETING_PRICING[tier].monthly,
      currency: "gbp",
      recurring: { interval: "month" },
      metadata: { product_type: "marketing", tier, billing_cycle: "monthly" },
      nickname: `Marketing Suite — ${tier.charAt(0).toUpperCase() + tier.slice(1)} (Monthly)`,
    });

    const marketingAnnual = await stripe.prices.create({
      product: marketingProduct.id,
      unit_amount: MARKETING_PRICING[tier].annual * 12, // annual total
      currency: "gbp",
      recurring: { interval: "year" },
      metadata: { product_type: "marketing", tier, billing_cycle: "annual" },
      nickname: `Marketing Suite — ${tier.charAt(0).toUpperCase() + tier.slice(1)} (Annual)`,
    });

    results.marketing[tier] = { monthly: marketingMonthly.id, annual: marketingAnnual.id };
  }

  console.log("=== COPY THIS INTO tier-config.ts ===\n");
  console.log("export const STRIPE_PRICE_IDS = {");
  for (const product of ["sales", "marketing"] as const) {
    console.log(`  ${product}: {`);
    for (const tier of TIERS) {
      console.log(`    ${tier}: { monthly: "${results[product][tier].monthly}", annual: "${results[product][tier].annual}" },`);
    }
    console.log("  },");
  }
  console.log("} as const;\n");

  console.log("Done! Paste the above into src/lib/tier-config.ts");
}

main().catch(console.error);
