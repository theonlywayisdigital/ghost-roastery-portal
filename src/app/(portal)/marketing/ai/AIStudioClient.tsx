"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMarketingContext } from "@/lib/marketing-context";
import {
  Sparkles,
  Send,
  Share2,
  Zap,
  Lightbulb,
  Loader2,
  Calendar,
  ArrowRight,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

type PlanType = "campaign" | "social" | "automation" | "ideas";
type ActiveSection = PlanType | null;

// ─── Main Component ───────────────────────────────────────────
export function AIStudioClient() {
  const [activeSection, setActiveSection] = useState<ActiveSection>(null);

  return (
    <div className="space-y-4">
      {/* Hero */}
      <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl border border-violet-200 p-6 text-center">
        <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center mx-auto mb-3">
          <Sparkles className="w-5 h-5 text-violet-600" />
        </div>
        <h2 className="text-lg font-semibold text-slate-900 mb-1">AI Studio</h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          Strategic planning tools to help you think about what to create, then create it.
        </p>
      </div>

      {/* Section Cards */}
      <CampaignPlannerSection
        active={activeSection === "campaign"}
        onToggle={() => setActiveSection(activeSection === "campaign" ? null : "campaign")}
      />
      <SocialPlannerSection
        active={activeSection === "social"}
        onToggle={() => setActiveSection(activeSection === "social" ? null : "social")}
      />
      <AutomationPlannerSection
        active={activeSection === "automation"}
        onToggle={() => setActiveSection(activeSection === "automation" ? null : "automation")}
      />
      <ContentIdeasSection
        active={activeSection === "ideas"}
        onToggle={() => setActiveSection(activeSection === "ideas" ? null : "ideas")}
      />
    </div>
  );
}

// ─── Shared Types ─────────────────────────────────────────────
interface SectionProps {
  active: boolean;
  onToggle: () => void;
}

// ─── Section Wrapper ──────────────────────────────────────────
function SectionCard({
  icon: Icon,
  title,
  description,
  color,
  bgColor,
  active,
  onToggle,
  children,
}: SectionProps & {
  icon: typeof Send;
  title: string;
  description: string;
  color: string;
  bgColor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors text-left"
      >
        <div className={`w-9 h-9 ${bgColor} rounded-lg flex items-center justify-center shrink-0`}>
          <Icon className={`w-4.5 h-4.5 ${color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
        {active ? (
          <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
        )}
      </button>
      {active && <div className="border-t border-slate-100 p-4">{children}</div>}
    </div>
  );
}

// ─── Campaign Planner ─────────────────────────────────────────
function CampaignPlannerSection(props: SectionProps) {
  const router = useRouter();
  const { pageBase } = useMarketingContext();
  const [goal, setGoal] = useState("");
  const [audience, setAudience] = useState("all customers");
  const [timeframe, setTimeframe] = useState("2 weeks");
  const [channels, setChannels] = useState("email and social");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<Record<string, unknown> | null>(null);

  async function handleGenerate() {
    if (!goal.trim()) { setError("Please describe your campaign goal."); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_type: "campaign", inputs: { goal, audience, timeframe, channels } }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed"); setLoading(false); return; }
      setPlan(data.plan);
    } catch { setError("Failed to connect."); }
    setLoading(false);
  }

  const emails = (plan?.emails || []) as Array<Record<string, unknown>>;
  const socialPosts = (plan?.social_posts || []) as Array<Record<string, unknown>>;

  return (
    <SectionCard
      icon={Send}
      title="Campaign Planner"
      description="Plan a complete multi-channel campaign"
      color="text-blue-600"
      bgColor="bg-blue-50"
      {...props}
    >
      {!plan ? (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Campaign goal</label>
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              rows={2}
              placeholder="e.g. Launch new single origin coffee, drive wholesale signups, holiday promotion..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              disabled={loading}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Audience</label>
              <select value={audience} onChange={(e) => setAudience(e.target.value)} disabled={loading}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>all customers</option>
                <option>new customers</option>
                <option>repeat buyers</option>
                <option>wholesale buyers</option>
                <option>leads</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Timeframe</label>
              <select value={timeframe} onChange={(e) => setTimeframe(e.target.value)} disabled={loading}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>1 week</option>
                <option>2 weeks</option>
                <option>1 month</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Channels</label>
              <select value={channels} onChange={(e) => setChannels(e.target.value)} disabled={loading}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>email and social</option>
                <option>email only</option>
                <option>social only</option>
              </select>
            </div>
          </div>
          {error && <ErrorBanner message={error} />}
          <button onClick={handleGenerate} disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Planning...</> : <><Sparkles className="w-4 h-4" />Plan Campaign</>}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-slate-700">{plan.summary as string}</p>

          {emails.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Email Sequence</h4>
              <div className="space-y-2">
                {emails.map((email, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold text-blue-600">
                      D{email.day as number}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900">{email.subject as string}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{email.description as string}</p>
                    </div>
                    <button
                      onClick={() => router.push(`/marketing?new=true&brief=${encodeURIComponent(email.brief as string || "")}`)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium shrink-0 flex items-center gap-1"
                    >
                      Create <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {socialPosts.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Social Posts</h4>
              <div className="space-y-2">
                {socialPosts.map((post, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                    <div className="w-8 h-8 bg-pink-100 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold text-pink-600">
                      D{post.day as number}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-400 mb-0.5">{post.platform as string}</p>
                      <p className="text-sm text-slate-700">{post.caption as string}</p>
                    </div>
                    <button
                      onClick={() => router.push(`${pageBase}/social/compose?content=${encodeURIComponent(post.caption as string || "")}`)}
                      className="text-xs text-pink-600 hover:text-pink-800 font-medium shrink-0 flex items-center gap-1"
                    >
                      Create <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {plan.discount_strategy ? (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <h4 className="text-xs font-semibold text-amber-700 mb-1">Discount Strategy</h4>
              <p className="text-sm text-amber-800">{plan.discount_strategy as string}</p>
            </div>
          ) : null}

          <button onClick={() => setPlan(null)} className="text-xs text-slate-500 hover:text-slate-700">
            Start over
          </button>
        </div>
      )}
    </SectionCard>
  );
}

// ─── Social Media Planner ─────────────────────────────────────
function SocialPlannerSection(props: SectionProps) {
  const router = useRouter();
  const { pageBase } = useMarketingContext();
  const [timeframe, setTimeframe] = useState("this week");
  const [platforms, setPlatforms] = useState("instagram, facebook");
  const [frequency, setFrequency] = useState("3 times per week");
  const [themes, setThemes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<Record<string, unknown> | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_type: "social", inputs: { timeframe, platforms, frequency, themes } }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed"); setLoading(false); return; }
      setPlan(data.plan);
    } catch { setError("Failed to connect."); }
    setLoading(false);
  }

  const posts = (plan?.posts || []) as Array<Record<string, unknown>>;

  return (
    <SectionCard
      icon={Share2}
      title="Social Media Planner"
      description="Plan your social content calendar"
      color="text-pink-600"
      bgColor="bg-pink-50"
      {...props}
    >
      {!plan ? (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Timeframe</label>
              <select value={timeframe} onChange={(e) => setTimeframe(e.target.value)} disabled={loading}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-pink-500">
                <option>this week</option>
                <option>next week</option>
                <option>this month</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Platforms</label>
              <select value={platforms} onChange={(e) => setPlatforms(e.target.value)} disabled={loading}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-pink-500">
                <option>instagram, facebook</option>
                <option>instagram only</option>
                <option>facebook only</option>
                <option>all platforms</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Frequency</label>
              <select value={frequency} onChange={(e) => setFrequency(e.target.value)} disabled={loading}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-pink-500">
                <option>daily</option>
                <option>3 times per week</option>
                <option>weekly</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Content themes or products (optional)</label>
            <input
              value={themes}
              onChange={(e) => setThemes(e.target.value)}
              placeholder="e.g. new Ethiopian blend, behind the scenes, customer stories..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
              disabled={loading}
            />
          </div>
          {error && <ErrorBanner message={error} />}
          <button onClick={handleGenerate} disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-pink-600 text-white rounded-lg text-sm font-medium hover:bg-pink-700 disabled:opacity-50">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Planning...</> : <><Calendar className="w-4 h-4" />Plan Content</>}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-slate-700">{plan.summary as string}</p>
          <div className="space-y-2">
            {posts.map((post, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                <div className="text-center shrink-0 w-12">
                  <p className="text-xs font-bold text-slate-900">{post.day as string}</p>
                  <p className="text-[10px] text-slate-400">{post.best_time as string}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 mb-1">
                    <span className="text-[10px] font-medium text-pink-600 bg-pink-50 px-1.5 py-0.5 rounded">{post.platform as string}</span>
                    <span className="text-[10px] text-slate-400">{post.content_theme as string}</span>
                  </div>
                  <p className="text-sm text-slate-700">{post.caption as string}</p>
                  {post.image_concept ? (
                    <p className="text-xs text-slate-400 mt-1 italic">{post.image_concept as string}</p>
                  ) : null}
                </div>
                <button
                  onClick={() => router.push(`${pageBase}/social/compose?content=${encodeURIComponent(post.caption as string || "")}`)}
                  className="text-xs text-pink-600 hover:text-pink-800 font-medium shrink-0"
                >
                  Create
                </button>
              </div>
            ))}
          </div>
          <button onClick={() => setPlan(null)} className="text-xs text-slate-500 hover:text-slate-700">
            Start over
          </button>
        </div>
      )}
    </SectionCard>
  );
}

// ─── Automation Planner ───────────────────────────────────────
function AutomationPlannerSection(props: SectionProps) {
  const router = useRouter();
  const { pageBase } = useMarketingContext();
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<Record<string, unknown> | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_type: "automation", inputs: { notes } }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed"); setLoading(false); return; }
      setPlan(data.plan);
    } catch { setError("Failed to connect."); }
    setLoading(false);
  }

  const automations = (plan?.automations || []) as Array<Record<string, unknown>>;

  return (
    <SectionCard
      icon={Zap}
      title="Automation Planner"
      description="Get AI-suggested automations for your business"
      color="text-amber-600"
      bgColor="bg-amber-50"
      {...props}
    >
      {!plan ? (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Tell us about your business (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="e.g. We sell retail and wholesale, have 500 customers, want to focus on retention..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
              disabled={loading}
            />
          </div>
          {error && <ErrorBanner message={error} />}
          <div className="flex items-center gap-3">
            <button onClick={handleGenerate} disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Thinking...</> : <><Zap className="w-4 h-4" />Suggest Automations</>}
            </button>
            <span className="text-xs text-slate-400">or</span>
            <button
              onClick={() => router.push(`${pageBase}/automations/ai-builder`)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700"
            >
              <Sparkles className="w-4 h-4" />Build Custom Automation
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {automations.map((auto, i) => {
            const steps = (auto.steps || []) as Array<Record<string, unknown>>;
            const priorityColor = auto.priority === "high" ? "text-red-600 bg-red-50" : auto.priority === "medium" ? "text-amber-600 bg-amber-50" : "text-slate-600 bg-slate-100";
            return (
              <div key={i} className="p-4 bg-slate-50 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-semibold text-slate-900">{auto.name as string}</h4>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${priorityColor}`}>{auto.priority as string}</span>
                    </div>
                    <p className="text-xs text-slate-500">{auto.description as string}</p>
                  </div>
                  <button
                    onClick={() => router.push(`${pageBase}/automations/ai-builder?brief=${encodeURIComponent(auto.description as string || auto.name as string)}`)}
                    className="text-xs text-violet-600 hover:text-violet-800 font-medium shrink-0 flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />Build <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex items-center gap-1 mt-2">
                  {steps.map((step, j) => (
                    <div key={j} className="flex items-center gap-1">
                      {j > 0 && <div className="w-4 h-px bg-slate-300" />}
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${step.type === "email" ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-500"}`}>
                        {step.type === "email" ? "Email" : `${step.delay_days}d wait`}
                      </span>
                    </div>
                  ))}
                </div>
                {auto.expected_impact ? (
                  <p className="text-xs text-slate-400 mt-2">{auto.expected_impact as string}</p>
                ) : null}
              </div>
            );
          })}
          <button onClick={() => setPlan(null)} className="text-xs text-slate-500 hover:text-slate-700">
            Start over
          </button>
        </div>
      )}
    </SectionCard>
  );
}

// ─── Content Ideas ────────────────────────────────────────────
function ContentIdeasSection(props: SectionProps) {
  const [category, setCategory] = useState("everything");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<Record<string, unknown> | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_type: "ideas", inputs: { category, notes } }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed"); setLoading(false); return; }
      setPlan(data.plan);
    } catch { setError("Failed to connect."); }
    setLoading(false);
  }

  const ideas = (plan?.ideas || []) as Array<Record<string, unknown>>;
  const typeColor: Record<string, string> = {
    email: "bg-blue-50 text-blue-600",
    social: "bg-pink-50 text-pink-600",
    promotion: "bg-amber-50 text-amber-600",
    blog: "bg-green-50 text-green-600",
  };

  return (
    <SectionCard
      icon={Lightbulb}
      title="Content Ideas"
      description="Get fresh content ideas for your marketing"
      color="text-emerald-600"
      bgColor="bg-emerald-50"
      {...props}
    >
      {!plan ? (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">I want ideas for...</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} disabled={loading}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
              <option value="everything">Everything</option>
              <option value="email campaigns">Email campaigns</option>
              <option value="social media posts">Social media posts</option>
              <option value="promotions and offers">Promotions and offers</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Any context? (optional)</label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. we just launched a new blend, Valentine's Day is coming..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              disabled={loading}
            />
          </div>
          {error && <ErrorBanner message={error} />}
          <button onClick={handleGenerate} disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Thinking...</> : <><Lightbulb className="w-4 h-4" />Give Me Ideas</>}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {ideas.map((idea, i) => (
            <div key={i} className="p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-slate-400">{i + 1}</span>
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${typeColor[idea.type as string] || "bg-slate-100 text-slate-600"}`}>
                  {idea.type as string}
                </span>
                <h4 className="text-sm font-medium text-slate-900">{idea.title as string}</h4>
              </div>
              <p className="text-xs text-slate-500 ml-6">{idea.description as string}</p>
            </div>
          ))}
          <button onClick={() => setPlan(null)} className="text-xs text-slate-500 hover:text-slate-700">
            Start over
          </button>
        </div>
      )}
    </SectionCard>
  );
}

// ─── Shared Components ────────────────────────────────────────
function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 p-2.5 bg-red-50 border border-red-100 rounded-lg">
      <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
      <p className="text-xs text-red-700">{message}</p>
    </div>
  );
}
