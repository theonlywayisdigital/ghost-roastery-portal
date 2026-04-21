import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AgentSpike } from "./AgentSpike";

export default async function AIAgentSpikePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.roles.includes("roaster")) redirect("/dashboard");

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">AI Agent Spike</h1>
        <p className="text-sm text-slate-500 mt-1">
          Proof of concept — Gemini function calling with review-before-execute.
        </p>
      </div>
      <AgentSpike />
    </>
  );
}
