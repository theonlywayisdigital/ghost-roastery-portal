import { Clock } from "@/components/icons";

interface ComingSoonProps {
  title: string;
  description: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export function ComingSoon({ title, description, icon: Icon = Clock }: ComingSoonProps) {
  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center max-w-lg mx-auto">
        <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-4">
          <Icon className="w-6 h-6 text-slate-400" />
        </div>
        <h2 className="text-lg font-semibold text-slate-900 mb-2">
          Coming Soon
        </h2>
        <p className="text-slate-500 text-sm">
          {description}
        </p>
      </div>
    </>
  );
}
