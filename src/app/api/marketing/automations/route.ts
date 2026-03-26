import { NextRequest, NextResponse } from "next/server";
import { getMarketingOwner, applyOwnerFilter } from "@/lib/marketing-auth";
import { createServerClient } from "@/lib/supabase";
import { checkFeature } from "@/lib/feature-gates";

export async function GET(request: NextRequest) {
  const owner = await getMarketingOwner(request);
  if (!owner) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();

  // Get templates (roaster_id IS NULL and is_template = true)
  const { data: templates } = await supabase
    .from("automations")
    .select("*, automation_steps(*)")
    .is("roaster_id", null)
    .eq("is_template", true)
    .order("created_at", { ascending: true });

  // Get owner's own automations (with step count)
  const { data: automations } = await applyOwnerFilter(
    supabase.from("automations").select("*, automation_steps(count)"),
    owner
  )
    .eq("is_template", false)
    .order("created_at", { ascending: false });

  // Flatten step count from Supabase's nested aggregation format
  const automationsWithCount = (automations || []).map((a) => {
    const stepCount = (a.automation_steps as { count: number }[])?.[0]?.count ?? 0;
    const { automation_steps: _, ...rest } = a;
    return { ...rest, step_count: stepCount };
  });

  return NextResponse.json({
    templates: templates || [],
    automations: automationsWithCount,
  });
}

export async function POST(request: NextRequest) {
  const owner = await getMarketingOwner(request);
  if (!owner) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check automations feature gate
    if (owner.owner_id) {
      const featureCheck = await checkFeature(owner.owner_id, "automations");
      if (!featureCheck.allowed) {
        return NextResponse.json(
          { error: featureCheck.message, upgrade_required: true },
          { status: 403 }
        );
      }
    }

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
