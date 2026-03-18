import { NextResponse } from "next/server";
import { createServerClient, createAuthServerClient } from "@/lib/supabase";

export async function PATCH(request: Request) {
  try {
    // Authenticate via cookie
    const authClient = await createAuthServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { firstName, lastName, phone, businessName, vatNumber, roasterId } =
      body as {
        firstName?: string;
        lastName?: string;
        phone?: string;
        businessName?: string;
        vatNumber?: string;
        roasterId: string;
      };

    if (!roasterId) {
      return NextResponse.json(
        { error: "roasterId is required" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Update personal details on public.users
    const fullName = [firstName, lastName].filter(Boolean).join(" ") || null;
    const userUpdates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (firstName !== undefined || lastName !== undefined) {
      userUpdates.full_name = fullName;
    }
    if (phone !== undefined) {
      userUpdates.phone = phone || null;
    }

    if (Object.keys(userUpdates).length > 1) {
      const { error: userError } = await supabase
        .from("users")
        .update(userUpdates)
        .eq("id", user.id);

      if (userError) {
        console.error("Failed to update user:", userError);
        return NextResponse.json(
          { error: "Failed to update profile" },
          { status: 500 }
        );
      }
    }

    // Update business details on wholesale_access
    if (businessName !== undefined || vatNumber !== undefined) {
      const waUpdates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (businessName !== undefined) waUpdates.business_name = businessName || null;
      if (vatNumber !== undefined) waUpdates.vat_number = vatNumber || null;

      const { error: waError } = await supabase
        .from("wholesale_access")
        .update(waUpdates)
        .eq("user_id", user.id)
        .eq("roaster_id", roasterId);

      if (waError) {
        console.error("Failed to update wholesale_access:", waError);
        return NextResponse.json(
          { error: "Failed to update business details" },
          { status: 500 }
        );
      }

      // Also sync to linked businesses record
      const { data: wa } = await supabase
        .from("wholesale_access")
        .select("business_id")
        .eq("user_id", user.id)
        .eq("roaster_id", roasterId)
        .single();

      if (wa?.business_id) {
        const bizUpdates: Record<string, unknown> = {
          updated_at: new Date().toISOString(),
        };
        if (businessName !== undefined) bizUpdates.name = businessName;
        if (vatNumber !== undefined) bizUpdates.vat_number = vatNumber || null;

        await supabase
          .from("businesses")
          .update(bizUpdates)
          .eq("id", wa.business_id);
      }
    }

    // Update contacts record if it exists (keep CRM in sync)
    if (firstName !== undefined || lastName !== undefined || phone !== undefined) {
      const contactUpdates: Record<string, unknown> = {};
      if (firstName !== undefined) contactUpdates.first_name = firstName || null;
      if (lastName !== undefined) contactUpdates.last_name = lastName || null;
      if (phone !== undefined) contactUpdates.phone = phone || null;

      await supabase
        .from("contacts")
        .update(contactUpdates)
        .eq("user_id", user.id)
        .eq("roaster_id", roasterId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Buyer profile update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
