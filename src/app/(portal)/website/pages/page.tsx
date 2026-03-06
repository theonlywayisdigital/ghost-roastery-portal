import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { ScaffoldPages } from "./ScaffoldPages";

export default async function WebsitePagesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.roaster) redirect("/dashboard");

  const supabase = createServerClient();

  // Get the website for this roaster
  const { data: website } = await supabase
    .from("websites")
    .select("id")
    .eq("roaster_id", user.roaster.id)
    .single();

  // Fetch pages via website_id
  const { data: pages } = website
    ? await supabase
        .from("website_pages")
        .select("id, title, slug, is_published, sort_order, updated_at")
        .eq("website_id", website.id)
        .order("sort_order", { ascending: true })
    : { data: null };

  // If pages exist, redirect to the first page's editor
  if (pages && pages.length > 0) {
    redirect(`/website/pages/${pages[0].id}`);
  }

  // No pages — show the scaffold template picker
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Pages</h1>
        <p className="text-slate-500 text-sm mt-1">
          Set up your website to get started.
        </p>
      </div>
      <ScaffoldPages />
    </div>
  );
}
