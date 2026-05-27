"use client";

import { formatRelativeTime } from "@/components/shared/orders/format";
import { ShoppingCart, LifeBuoy, Building2, Handshake } from "@/components/icons";

export interface AdminActivityItem {
  id: string;
  type: "order" | "ticket" | "roaster_signup" | "partner_application";
  description: string;
  timestamp: string;
}

const activityIconMap: Record<
  AdminActivityItem["type"],
  { Icon: typeof ShoppingCart; bg: string; text: string }
> = {
  order: { Icon: ShoppingCart, bg: "bg-blue-50", text: "text-blue-600" },
  ticket: { Icon: LifeBuoy, bg: "bg-rose-50", text: "text-rose-600" },
  roaster_signup: { Icon: Building2, bg: "bg-green-50", text: "text-green-600" },
  partner_application: { Icon: Handshake, bg: "bg-indigo-50", text: "text-indigo-600" },
};

export function AdminActivityWidget({ activityItems }: { activityItems: AdminActivityItem[] }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 h-full flex flex-col">
      <h2 className="text-base font-semibold text-slate-900 mb-4">
        Recent Platform Activity
      </h2>

      {activityItems.length === 0 ? (
        <p className="text-sm text-slate-500 py-8 text-center">No recent activity.</p>
      ) : (
        <div className="space-y-3 flex-1 overflow-hidden">
          {activityItems.map((item) => {
            const config = activityIconMap[item.type];
            const { Icon } = config;
            return (
              <div key={item.id} className="flex gap-3">
                <div
                  className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center ${config.bg}`}
                >
                  <Icon className={`w-4 h-4 ${config.text}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-700 line-clamp-1">
                    {item.description}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {formatRelativeTime(item.timestamp)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
