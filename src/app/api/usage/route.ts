import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getRoasterUsageSummary } from "@/lib/feature-gates";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const roasterId = user.roaster?.id as string | undefined;
  if (!roasterId) {
    return NextResponse.json({ error: "No roaster found" }, { status: 400 });
  }

  const summary = await getRoasterUsageSummary(roasterId);
  if (!summary) {
    return NextResponse.json({ error: "Roaster not found" }, { status: 404 });
  }

  // Replace Infinity with -1 for JSON serialization (Infinity → null in JSON)
  const safeLimits = { ...summary.limits };
  for (const key of Object.keys(safeLimits) as Array<keyof typeof safeLimits>) {
    if (safeLimits[key].limit === Infinity) {
      safeLimits[key] = { ...safeLimits[key], limit: -1 };
    }
  }

  return NextResponse.json({ ...summary, limits: safeLimits });
}
