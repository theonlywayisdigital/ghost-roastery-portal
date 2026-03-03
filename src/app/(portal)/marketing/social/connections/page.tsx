import { Suspense } from "react";
import { ConnectionsPage } from "./ConnectionsPage";
import { Loader2 } from "lucide-react";

export default function ConnectionsRoute() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
        </div>
      }
    >
      <ConnectionsPage />
    </Suspense>
  );
}
