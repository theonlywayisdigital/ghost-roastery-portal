import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const formId = new URL(request.url).searchParams.get("id");
  const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL || "";

  const js = `
(function() {
  var formId = ${JSON.stringify(formId)};
  var portalUrl = ${JSON.stringify(portalUrl)};
  if (!formId) return;

  var container = document.getElementById('gr-form-' + formId);
  if (!container) return;

  var iframe = document.createElement('iframe');
  iframe.src = portalUrl + '/f/' + formId + '?embed=1';
  iframe.style.width = '100%';
  iframe.style.border = 'none';
  iframe.style.minHeight = '300px';
  iframe.setAttribute('scrolling', 'no');
  iframe.setAttribute('title', 'Form');

  // Auto-resize iframe
  window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'gr-form-resize' && e.data.formId === formId) {
      iframe.style.height = e.data.height + 'px';
    }
    if (e.data && e.data.type === 'gr-form-redirect' && e.data.formId === formId) {
      window.location.href = e.data.url;
    }
  });

  container.appendChild(iframe);
})();
`;

  return new NextResponse(js, {
    headers: {
      "Content-Type": "application/javascript",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
