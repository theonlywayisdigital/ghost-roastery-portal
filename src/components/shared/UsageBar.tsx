"use client";

interface UsageBarProps {
  current: number;
  limit: number;
  label: string;
}

export function UsageBar({ current: rawCurrent, limit: rawLimit, label }: UsageBarProps) {
  const current = rawCurrent ?? 0;
  const limit = rawLimit ?? 0;
  // -1 is the JSON-safe sentinel for Infinity (Infinity serializes as null in JSON)
  const isUnlimited = limit === Infinity || limit === -1 || limit == null || !isFinite(limit);
  const percentUsed = isUnlimited || limit <= 0 ? 0 : Math.min(Math.round((current / limit) * 100), 100);
  const isWarning = percentUsed >= 80 && percentUsed < 100;
  const isBlocked = percentUsed >= 100;

  const barColor = isBlocked
    ? "bg-red-500"
    : isWarning
      ? "bg-amber-500"
      : "bg-slate-400";

  const textColor = isBlocked
    ? "text-red-600"
    : isWarning
      ? "text-amber-600"
      : "text-slate-500";

  const formatValue = (v: number) => {
    if (v == null) return "0";
    if (v === Infinity || !isFinite(v)) return "Unlimited";
    return v.toLocaleString("en-GB");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <span className={`text-xs font-medium ${textColor}`}>
          {isUnlimited
            ? `${formatValue(current)} used`
            : `${formatValue(current)} of ${formatValue(limit)}`}
        </span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: isUnlimited ? "0%" : `${percentUsed}%` }}
        />
      </div>
      {!isUnlimited && (
        <div className="flex justify-end mt-0.5">
          <span className={`text-xs ${textColor}`}>
            {`${percentUsed}%`}
          </span>
        </div>
      )}
    </div>
  );
}
