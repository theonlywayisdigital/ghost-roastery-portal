import {
  BarChart3,
  TrendingUp,
  Users,
  Mail,
  MousePointerClick,
  Eye,
} from "@/components/icons";

const FEATURES = [
  { icon: TrendingUp, title: "Campaign Performance", description: "Track open rates, click rates, and conversions over time." },
  { icon: Users, title: "Audience Growth", description: "Monitor subscriber growth and churn rates." },
  { icon: Mail, title: "Email Health", description: "Track deliverability, bounces, and spam complaints." },
  { icon: MousePointerClick, title: "Click Heatmaps", description: "See which links get the most clicks in your emails." },
  { icon: Eye, title: "A/B Test Results", description: "Compare subject lines and content variations." },
  { icon: BarChart3, title: "Revenue Attribution", description: "Track revenue generated from email campaigns." },
];

export default function AnalyticsPage() {
  return (
    <div>
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center max-w-2xl mx-auto mb-8">
        <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center mx-auto mb-4">
          <BarChart3 className="w-6 h-6 text-emerald-600" />
        </div>
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Marketing Analytics</h2>
        <p className="text-slate-500 text-sm mb-1">
          Comprehensive analytics across all your marketing channels.
        </p>
        <p className="text-xs text-slate-400">Coming soon — Q3 2026</p>
      </div>

      <h3 className="text-sm font-semibold text-slate-700 mb-3">Planned Dashboards</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {FEATURES.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              className="bg-white rounded-xl border border-slate-200 p-4 opacity-60"
            >
              <div className="w-9 h-9 bg-slate-50 rounded-lg flex items-center justify-center mb-3">
                <Icon className="w-4.5 h-4.5 text-slate-400" />
              </div>
              <h4 className="text-sm font-medium text-slate-900 mb-1">{item.title}</h4>
              <p className="text-xs text-slate-500">{item.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
