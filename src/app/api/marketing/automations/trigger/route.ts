import { NextRequest, NextResponse } from "next/server";
import { fireAutomationTrigger } from "@/lib/automation-triggers";
import type { TriggerType } from "@/types/marketing";

/**
 * POST /api/marketing/automations/trigger
 * Manual/internal trigger endpoint.
 * Backwards-compatible with existing callers.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { trigger_type, contact_id, roaster_id, event_data, context } = body;

    if (!trigger_type || !contact_id || !roaster_id) {
      return NextResponse.json(
        { error: "trigger_type, contact_id, and roaster_id required" },
        { status: 400 }
      );
    }

    const result = await fireAutomationTrigger({
      trigger_type: trigger_type as TriggerType,
      contact_id,
      roaster_id,
      event_data: event_data || {},
      context: context || {},
    });

    return NextResponse.json({
      enrolled: result.enrolled,
      message: `Enrolled in ${result.enrolled} automation(s)`,
    });
  } catch (error) {
    console.error("Trigger error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
