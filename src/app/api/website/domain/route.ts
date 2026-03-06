import { NextResponse } from "next/server";
import { getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

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

    // Check domain not already taken by another roaster
    const { data: existing } = await supabase
      .from("partner_roasters")
      .select("id")
      .eq("website_custom_domain", domain.toLowerCase())
      .neq("id", roaster.id)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "This domain is already in use by another roaster" },
        { status: 400 }
      );
    }

    // Save domain (unverified)
    const { error } = await supabase
      .from("partner_roasters")
      .update({
        website_custom_domain: domain.toLowerCase(),
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

    // TODO: Call Vercel API to add domain to project
    // const vercelResponse = await fetch(`https://api.vercel.com/v10/projects/${projectId}/domains`, {
    //   method: "POST",
    //   headers: { Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}` },
    //   body: JSON.stringify({ name: domain.toLowerCase() }),
    // });

    return NextResponse.json({
      domain: domain.toLowerCase(),
      verified: false,
      message: "Domain saved. Please add a CNAME record pointing to cname.vercel-dns.com",
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

  // TODO: Call Vercel API to remove domain from project

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
