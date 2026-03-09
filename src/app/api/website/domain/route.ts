import { NextResponse } from "next/server";
import { getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

const VERCEL_API_TOKEN = process.env.VERCEL_API_TOKEN;
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID;
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID;

function vercelHeaders() {
  return {
    Authorization: `Bearer ${VERCEL_API_TOKEN}`,
    "Content-Type": "application/json",
  };
}

function vercelParams() {
  return VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : "";
}

export async function GET() {
  const roaster = await getCurrentRoaster();
  if (!roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    domain: roaster.website_custom_domain || null,
    verified: roaster.website_domain_verified || false,
  });
}

export async function POST(request: Request) {
  const roaster = await getCurrentRoaster();
  if (!roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { domain } = body;

    if (!domain) {
      return NextResponse.json(
        { error: "Domain is required" },
        { status: 400 }
      );
    }

    // Basic domain validation
    const domainRegex = /^([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    if (!domainRegex.test(domain)) {
      return NextResponse.json(
        { error: "Invalid domain format" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    const normalised = domain.toLowerCase();

    // Check domain not already taken by another roaster
    const { data: existing } = await supabase
      .from("partner_roasters")
      .select("id")
      .eq("website_custom_domain", normalised)
      .neq("id", roaster.id)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "This domain is already in use by another roaster" },
        { status: 400 }
      );
    }

    // If changing domain, remove old one from Vercel first
    if (
      VERCEL_API_TOKEN &&
      VERCEL_PROJECT_ID &&
      roaster.website_custom_domain &&
      roaster.website_custom_domain !== normalised
    ) {
      try {
        await fetch(
          `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/domains/${roaster.website_custom_domain}${vercelParams()}`,
          { method: "DELETE", headers: vercelHeaders() }
        );
      } catch {
        // ignore — old domain may not exist in Vercel
      }
    }

    // Register domain with Vercel
    let vercelRegistered = false;
    if (VERCEL_API_TOKEN && VERCEL_PROJECT_ID) {
      try {
        const res = await fetch(
          `https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains${vercelParams()}`,
          {
            method: "POST",
            headers: vercelHeaders(),
            body: JSON.stringify({ name: normalised }),
          }
        );
        if (res.ok) {
          vercelRegistered = true;
        } else {
          const errData = await res.json();
          // Domain may already exist in project — treat as success
          if (errData?.error?.code === "domain_already_in_use") {
            vercelRegistered = true;
          } else {
            console.error("Vercel domain add error:", errData);
          }
        }
      } catch (err) {
        console.error("Vercel API error:", err);
      }
    }

    // Save domain to database
    const { error } = await supabase
      .from("partner_roasters")
      .update({
        website_custom_domain: normalised,
        website_domain_verified: false,
      })
      .eq("id", roaster.id);

    if (error) {
      console.error("Domain save error:", error);
      return NextResponse.json(
        { error: "Failed to save domain" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      domain: normalised,
      verified: false,
      vercelRegistered,
      message: "Domain saved. Add a CNAME record pointing to cname.vercel-dns.com and click Verify.",
    });
  } catch (error) {
    console.error("Domain save error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const roaster = await getCurrentRoaster();
  if (!roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();

  // Remove domain from Vercel
  if (VERCEL_API_TOKEN && VERCEL_PROJECT_ID && roaster.website_custom_domain) {
    try {
      await fetch(
        `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/domains/${roaster.website_custom_domain}${vercelParams()}`,
        { method: "DELETE", headers: vercelHeaders() }
      );
    } catch (err) {
      console.error("Vercel domain remove error:", err);
    }
  }

  const { error } = await supabase
    .from("partner_roasters")
    .update({
      website_custom_domain: null,
      website_domain_verified: false,
    })
    .eq("id", roaster.id);

  if (error) {
    console.error("Domain remove error:", error);
    return NextResponse.json(
      { error: "Failed to remove domain" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
