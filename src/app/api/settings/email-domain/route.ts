import { NextResponse } from "next/server";
import { getCurrentUser, getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { Resend } from "resend";
import { checkFeature } from "@/lib/feature-gates";

const resend = new Resend(process.env.RESEND_API_KEY);

/** Map roaster country code to Resend region for domain creation */
function getResendRegion(country: string): "us-east-1" | "eu-west-1" | "sa-east-1" | "ap-northeast-1" {
  const eu = new Set(["GB", "IE", "DE", "FR", "NL", "ES", "IT", "PT", "AT", "BE", "CH", "SE", "NO", "DK", "FI", "PL", "CZ", "GR", "RO", "HU", "BG", "HR", "SK", "SI", "LT", "LV", "EE", "LU", "MT", "CY", "IS"]);
  const apac = new Set(["JP", "KR", "CN", "AU", "NZ", "SG", "HK", "TW", "IN", "TH", "MY", "PH", "ID", "VN"]);
  const sa = new Set(["BR", "AR", "CL", "CO", "PE", "MX", "UY", "PY", "EC", "VE", "BO"]);

  const code = country.toUpperCase();
  if (eu.has(code)) return "eu-west-1";
  if (apac.has(code)) return "ap-northeast-1";
  if (sa.has(code)) return "sa-east-1";
  return "us-east-1";
}

// GET — list all custom domains for the roaster
export async function GET() {
  const user = await getCurrentUser();
  const roaster = await getCurrentRoaster();
  if (!user || !roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const { data: domains, error } = await supabase
    .from("roaster_email_domains")
    .select("*")
    .eq("roaster_id", roaster.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Fetch email domains error:", error);
    return NextResponse.json({ error: "Failed to fetch domains" }, { status: 500 });
  }

  // Check if the feature is available
  const featureCheck = await checkFeature(roaster.id as string, "customEmailDomain");

  return NextResponse.json({
    domains: domains || [],
    featureAllowed: featureCheck.allowed,
  });
}

// POST — add a new custom domain
export async function POST(request: Request) {
  const user = await getCurrentUser();
  const roaster = await getCurrentRoaster();
  if (!user || !roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Tier gate
  const featureCheck = await checkFeature(roaster.id as string, "customEmailDomain");
  if (!featureCheck.allowed) {
    return NextResponse.json(
      { error: "Custom email domains require a paid plan. Upgrade to get started.", upgrade_required: true },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { domain, senderPrefix } = body as { domain?: string; senderPrefix?: string };

  if (!domain || typeof domain !== "string") {
    return NextResponse.json({ error: "Domain is required" }, { status: 400 });
  }

  // Basic domain validation
  const cleanDomain = domain.toLowerCase().trim();
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(cleanDomain)) {
    return NextResponse.json({ error: "Invalid domain format" }, { status: 400 });
  }

  const supabase = createServerClient();

  // Check for existing domain
  const { data: existing } = await supabase
    .from("roaster_email_domains")
    .select("id")
    .eq("roaster_id", roaster.id)
    .eq("domain", cleanDomain)
    .single();

  if (existing) {
    return NextResponse.json({ error: "This domain is already added" }, { status: 400 });
  }

  try {
    // Create domain in Resend with region based on roaster country
    const region = getResendRegion((roaster.country as string) || "GB");
    const resendDomain = await resend.domains.create({
      name: cleanDomain,
      region,
    });

    if (!resendDomain.data) {
      console.error("Resend domain create error:", resendDomain.error);
      return NextResponse.json(
        { error: "Failed to register domain with email provider" },
        { status: 500 }
      );
    }

    // Save to database
    const { data: emailDomain, error: insertError } = await supabase
      .from("roaster_email_domains")
      .insert({
        roaster_id: roaster.id,
        domain: cleanDomain,
        resend_domain_id: resendDomain.data.id,
        status: resendDomain.data.status || "not_started",
        dns_records: resendDomain.data.records || null,
        sender_prefix: senderPrefix || "noreply",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert email domain error:", insertError);
      // Try to clean up Resend domain
      try {
        await resend.domains.remove(resendDomain.data.id);
      } catch {
        // Best effort cleanup
      }
      return NextResponse.json({ error: "Failed to save domain" }, { status: 500 });
    }

    return NextResponse.json({ domain: emailDomain });
  } catch (error) {
    console.error("Create email domain error:", error);
    return NextResponse.json({ error: "Failed to create domain" }, { status: 500 });
  }
}
