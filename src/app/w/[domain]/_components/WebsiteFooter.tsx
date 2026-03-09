import type { WebsiteTheme } from "@/lib/website-sections/types";

interface WebsiteFooterProps {
  siteName: string;
  theme: WebsiteTheme;
  pages: { title: string; slug: string }[];
  footerText?: string;
  basePath?: string;
}

export function WebsiteFooter({ siteName, theme, pages, footerText, basePath = "" }: WebsiteFooterProps) {
  const year = new Date().getFullYear();

  // Filter out "home" — logo already links to /
  const footerPages = pages.filter((p) => p.slug !== "home");

  return (
    <footer className="border-t border-slate-200 py-12 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Brand */}
          <div>
            <h3
              className="text-lg font-bold mb-2"
              style={{ fontFamily: `'${theme.headingFont}', sans-serif` }}
            >
              {siteName}
            </h3>
            {footerText && (
              <p className="text-sm text-slate-500 leading-relaxed">{footerText}</p>
            )}
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-sm font-semibold text-slate-900 mb-3">Pages</h4>
            <ul className="space-y-2">
              {footerPages.map((page) => (
                <li key={page.slug}>
                  <a
                    href={`${basePath}/${page.slug}`}
                    className="text-sm text-slate-500 hover:text-slate-700 no-underline"
                  >
                    {page.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Empty column for spacing */}
          <div />
        </div>

        <div className="border-t border-slate-100 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-slate-400">
            {`© ${year} ${siteName}. All rights reserved.`}
          </p>
          <p className="text-xs text-slate-300">
            Powered by{" "}
            <a href="https://ghostroasting.co.uk" className="text-slate-300 hover:text-slate-400 no-underline">
              Ghost Roastery
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
