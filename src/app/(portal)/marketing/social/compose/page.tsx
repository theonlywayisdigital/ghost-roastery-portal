import { Suspense } from "react";
import { PostComposer } from "./PostComposer";
import { Loader2 } from "lucide-react";

export default function ComposePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
        </div>
      }
    >
      <PostComposer />
    </Suspense>
  );
}
