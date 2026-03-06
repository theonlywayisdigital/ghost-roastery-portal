import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { PreviewClient } from "./PreviewClient";

export default async function WebsitePreviewPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.roaster) redirect("/dashboard");

  const slug = (user.roaster as Record<string, unknown>).storefront_slug as string | undefined;

  if (!slug) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">No Domain Set</h2>
          <p className="text-sm text-slate-500 mb-4">
            Set up a subdomain first to preview your website.
          </p>
          <a
            href="/website/domain"
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
          >
            Set Up Domain
          </a>
        </div>
      </div>
    );
  }

  const previewUrl = `/w/${slug}`;

  return <PreviewClient previewUrl={previewUrl} slug={slug} />;
}
