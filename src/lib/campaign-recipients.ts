import { createServerClient } from "@/lib/supabase";
import { applyOwnerFilter, type MarketingOwner } from "@/lib/marketing-auth";
import { splitName } from "@/lib/people";

type SupabaseClient = ReturnType<typeof createServerClient>;

export interface CampaignRecipient {
  id: string | null;
  email: string;
  first_name: string | null;
  last_name: string | null;
}

interface CampaignData {
  audience_type: string;
  audience_filter: Record<string, unknown> | null;
  roaster_id: string | null;
}

/**
 * Resolve the list of recipients for a campaign based on its audience_type
 * and audience_filter settings.
 *
 * For the cron/process route where there is no MarketingOwner context,
 * pass `owner` as null and the function will scope by campaign.roaster_id directly.
 */
export async function resolveCampaignRecipients(
  supabase: SupabaseClient,
  campaign: CampaignData,
  owner: MarketingOwner | null
): Promise<CampaignRecipient[]> {
  const audienceType = campaign.audience_type;

  // ── Custom: hand-picked email list ──
  if (audienceType === "custom") {
    const filter = campaign.audience_filter as {
      emails?: { email: string; name?: string; contactId?: string }[];
    } | null;
    const customEmails = filter?.emails || [];
    return customEmails.map((r) => {
      const { firstName, lastName } = splitName(r.name);
      return {
        id: r.contactId || null,
        email: r.email,
        first_name: firstName || null,
        last_name: lastName || null,
      };
    });
  }

  // ── Form submissions: 2-step query ──
  if (audienceType === "form_submissions") {
    const filter = campaign.audience_filter as { form_ids?: string[] } | null;
    const formIds = filter?.form_ids || [];
    if (formIds.length === 0) return [];

    // Step 1: distinct verified contact IDs from form_submissions
    const { data: submissions } = await supabase
      .from("form_submissions")
      .select("contact_id")
      .in("form_id", formIds)
      .not("contact_id", "is", null)
      .eq("email_verified", true);

    const contactIds = Array.from(
      new Set(
        (submissions || [])
          .map((s) => s.contact_id)
          .filter(Boolean) as string[]
      )
    );
    if (contactIds.length === 0) return [];

    // Step 2: standard contact filters
    let contactQuery = supabase
      .from("contacts")
      .select("id, email, first_name, last_name")
      .in("id", contactIds)
      .eq("status", "active")
      .not("email", "is", null)
      .eq("unsubscribed", false)
      .eq("marketing_consent", true);

    // Scope to owner
    if (owner) {
      contactQuery = applyOwnerFilter(contactQuery, owner);
    } else if (campaign.roaster_id) {
      contactQuery = contactQuery.eq("roaster_id", campaign.roaster_id);
    } else {
      contactQuery = contactQuery.is("roaster_id", null);
    }

    const { data: contacts } = await contactQuery;
    return (contacts || [])
      .filter((c) => c.email)
      .map((c) => ({
        id: c.id,
        email: c.email!,
        first_name: c.first_name,
        last_name: c.last_name,
      }));
  }

  // ── Contact-type-based audiences: all, customers, wholesale, suppliers, leads ──
  let contactQuery = supabase
    .from("contacts")
    .select("id, email, first_name, last_name")
    .eq("status", "active")
    .not("email", "is", null)
    .eq("unsubscribed", false)
    .eq("marketing_consent", true);

  // Scope to owner
  if (owner) {
    contactQuery = applyOwnerFilter(contactQuery, owner);
  } else if (campaign.roaster_id) {
    contactQuery = contactQuery.eq("roaster_id", campaign.roaster_id);
  } else {
    contactQuery = contactQuery.is("roaster_id", null);
  }

  if (audienceType !== "all") {
    const typeMap: Record<string, string> = {
      customers: "retail",
      wholesale: "wholesale",
      suppliers: "supplier",
      leads: "lead",
    };
    const contactType = typeMap[audienceType];
    if (contactType) {
      contactQuery = contactQuery.contains("types", [contactType]);
    }
  }

  const { data: contacts } = await contactQuery;
  return (contacts || [])
    .filter((c) => c.email)
    .map((c) => ({
      id: c.id,
      email: c.email!,
      first_name: c.first_name,
      last_name: c.last_name,
    }));
}
