import { NextResponse } from "next/server";
import { getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

const VERCEL_API_TOKEN = process.env.VERCEL_API_TOKEN;
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID;
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID;

export async function POST() {
  const roaster = await getCurrentRoaster();
  if (!roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!roaster.website_custom_domain) {
    return NextResponse.json(
      { error: "No custom domain configured" },
      { status: 400 }
    );
  }

  const domain = roaster.website_custom_domain as string;
  let verified = false;

  // Method 1: Check Vercel domain config status
  if (VERCEL_API_TOKEN && VERCEL_PROJECT_ID) {
    try {
      const params = VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : "";
      const res = await fetch(
        `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/domains/${domain}${params}`,
        {
          headers: { Authorization: `Bearer ${VERCEL_API_TOKEN}` },
        }
      );

      if (res.ok) {
        const data = await res.json();
        // Vercel returns verified: true when DNS is correctly configured
        verified = data.verified === true;
      }
    } catch (err) {
      console.error("Vercel domain check error:", err);
    }
  }

  // Method 2: DNS lookup fallback (if no Vercel token or Vercel check failed)
  if (!verified && (!VERCEL_API_TOKEN || !VERCEL_PROJECT_ID)) {
    try {
      const { resolveCname } = await import("dns/promises");
      const records = await resolveCname(domain);
      verified = records.some(
        (r: string) => r === "cname.vercel-dns.com" || r.endsWith(".vercel-dns.com")
      );
    } catch {
      // DNS lookup failed — domain not yet propagated
      verified = false;
    }
  }

  // Update verification status in database
  if (verified) {
    const supabase = createServerClient();
    await supabase
      .from("partner_roasters")
      .update({ website_domain_verified: true })
      .eq("id", roaster.id);
  }

  return NextResponse.json({
    verified,
    domain,
    message: verified
      ? "Domain verified and active"
      : "DNS record not found yet. This can take up to 48 hours to propagate. Please try again later.",
  });
}
