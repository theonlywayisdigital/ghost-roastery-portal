import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);

    const search = searchParams.get("search")?.toLowerCase() || "";
    const role = searchParams.get("role");
    const authStatus = searchParams.get("authStatus");
    const roasterId = searchParams.get("roasterId");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const offset = (page - 1) * limit;

    // Build profiles query with filters
    let query = supabase
      .from("profiles")
      .select("*", { count: "exact" });

    if (role) {
      query = query.eq("role", role);
    }
    if (authStatus) {
      query = query.eq("auth_status", authStatus);
    }
    if (roasterId) {
      query = query.eq("associated_roaster_id", roasterId);
    }

    // If no search, paginate at the DB level
    if (!search) {
      query = query.range(offset, offset + limit - 1);
    }

    const { data: profiles, error: profilesError, count } = await query;

    if (profilesError) {
      console.error("Admin users list error:", profilesError);
      return NextResponse.json(
        { error: "Failed to fetch users" },
        { status: 500 }
      );
    }

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ users: [], total: 0, page, limit });
    }

    // Batch-fetch auth users (single call, build map)
    const { data: authListData } = await supabase.auth.admin.listUsers({
      perPage: 1000,
    });
    const authUsersMap = new Map<string, { email: string; last_sign_in_at: string | null; created_at: string }>();
    if (authListData?.users) {
      for (const au of authListData.users) {
        authUsersMap.set(au.id, {
          email: au.email || "",
          last_sign_in_at: au.last_sign_in_at || null,
          created_at: au.created_at,
        });
      }
    }

    // Batch-fetch people records
    const peopleIds = profiles
      .map((p) => p.people_id)
      .filter(Boolean) as string[];

    const peopleMap = new Map<string, { id: string; first_name: string; last_name: string; email: string | null }>();
    if (peopleIds.length > 0) {
      const { data: people } = await supabase
        .from("people")
        .select("id, first_name, last_name, email")
        .in("id", peopleIds);
      if (people) {
        for (const p of people) {
          peopleMap.set(p.id, p);
        }
      }
    }

    // Batch-fetch roaster names
    const roasterIds = profiles
      .map((p) => p.associated_roaster_id)
      .filter(Boolean) as string[];

    const roasterMap = new Map<string, string>();
    if (roasterIds.length > 0) {
      const uniqueRoasterIds = Array.from(new Set(roasterIds));
      const { data: roasters } = await supabase
        .from("partner_roasters")
        .select("id, business_name")
        .in("id", uniqueRoasterIds);
      if (roasters) {
        for (const r of roasters) {
          roasterMap.set(r.id, r.business_name);
        }
      }
    }

    // Merge into unified objects
    let users = profiles.map((profile) => {
      const authUser = authUsersMap.get(profile.id);
      const person = profile.people_id ? peopleMap.get(profile.people_id) : null;
      const fullName = person
        ? `${person.first_name || ""} ${person.last_name || ""}`.trim()
        : null;

      return {
        id: profile.id,
        email: authUser?.email || person?.email || null,
        full_name: fullName,
        role: profile.role,
        associated_roaster_id: profile.associated_roaster_id,
        roaster_name: profile.associated_roaster_id
          ? roasterMap.get(profile.associated_roaster_id) || null
          : null,
        auth_status: profile.auth_status,
        last_login_at: profile.last_login_at || authUser?.last_sign_in_at || null,
        created_at: authUser?.created_at || profile.created_at,
        people_id: profile.people_id,
      };
    });

    // Post-fetch search filter (name/email span tables)
    let total = count || 0;
    if (search) {
      users = users.filter((u) => {
        const name = (u.full_name || "").toLowerCase();
        const email = (u.email || "").toLowerCase();
        return name.includes(search) || email.includes(search);
      });
      total = users.length;
      // Apply pagination after filtering
      users = users.slice(offset, offset + limit);
    }

    return NextResponse.json({ users, total, page, limit });
  } catch (error) {
    console.error("Admin users list error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
