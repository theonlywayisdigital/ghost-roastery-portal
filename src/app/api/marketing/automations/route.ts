import { NextRequest, NextResponse } from "next/server";
import { getMarketingOwner, applyOwnerFilter } from "@/lib/marketing-auth";
import { createServerClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const owner = await getMarketingOwner(request);
  if (!owner) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get("page_size") || "10", 10)));
  const includeTemplates = url.searchParams.get("templates") === "1";

  // Optionally include templates (for the /new creation page)
  let templates: unknown[] = [];
  if (includeTemplates) {
    const { data } = await supabase
      .from("automations")
      .select("*, automation_steps(*)")
      .is("roaster_id", null)
      .eq("is_template", true)
      .order("created_at", { ascending: true });
    // Remap automation_steps → steps to match AutomationWithSteps type
    templates = (data || []).map((t) => {
      const { automation_steps, ...rest } = t as Record<string, unknown>;
      return { ...rest, steps: automation_steps || [] };
    });
  }

  // Count total owner automations
  const { count: total } = await applyOwnerFilter(
    supabase.from("automations").select("id", { count: "exact", head: true }),
    owner
  ).eq("is_template", false);

  // Get owner's own automations (with step count) — paginated
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data: automations } = await applyOwnerFilter(
    supabase.from("automations").select("*, automation_steps(count)"),
    owner
  )
    .eq("is_template", false)
    .order("created_at", { ascending: false })
    .range(from, to);

  // Flatten step count from Supabase's nested aggregation format
  const automationsWithCount = (automations || []).map((a) => {
    const stepCount = (a.automation_steps as { count: number }[])?.[0]?.count ?? 0;
    const { automation_steps: _, ...rest } = a;
    return { ...rest, step_count: stepCount };
  });

  return NextResponse.json({
    templates,
    automations: automationsWithCount,
    total: total || 0,
    page,
    page_size: pageSize,
  });
}

export async function POST(request: NextRequest) {
  const owner = await getMarketingOwner(request);
  if (!owner) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const supabase = createServerClient();

    // If creating from a template, copy template and its steps
    if (body.template_id) {
      const { data: template } = await supabase
        .from("automations")
        .select("*, automation_steps(*)")
        .eq("id", body.template_id)
        .eq("is_template", true)
        .single();

      if (!template) {
        return NextResponse.json({ error: "Template not found" }, { status: 404 });
      }

      const { data: automation, error } = await supabase
        .from("automations")
        .insert({
          roaster_id: owner.owner_id,
          name: body.name || template.name,
          description: template.description,
          trigger_type: template.trigger_type,
          trigger_config: template.trigger_config,
          status: "draft",
          is_template: false,
        })
        .select()
        .single();

      if (error || !automation) {
        console.error("Create automation error:", error);
        return NextResponse.json({ error: "Failed to create automation" }, { status: 500 });
      }

      // Copy steps
      const steps = (template.automation_steps || [])
        .sort((a: { step_order: number }, b: { step_order: number }) => a.step_order - b.step_order);

      if (steps.length > 0) {
        const stepInserts = steps.map((s: { step_order: number; step_type: string; config: unknown }) => ({
          automation_id: automation.id,
          step_order: s.step_order,
          step_type: s.step_type,
          config: s.config,
        }));
        await supabase.from("automation_steps").insert(stepInserts);
      }

      return NextResponse.json({ automation });
    }

    // Create blank automation
    const { data: automation, error } = await supabase
      .from("automations")
      .insert({
        roaster_id: owner.owner_id,
        name: body.name || "Untitled Automation",
        description: body.description || null,
        trigger_type: body.trigger_type || "custom",
        trigger_config: body.trigger_config || {},
        trigger_filters: body.trigger_filters || null,
        status: "draft",
        is_template: false,
      })
      .select()
      .single();

    if (error) {
      console.error("Create automation error:", error);
      return NextResponse.json({ error: "Failed to create automation" }, { status: 500 });
    }

    return NextResponse.json({ automation });
  } catch (error) {
    console.error("Create automation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
