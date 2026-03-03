import type { EmailBlock } from "@/types/marketing";

export function renderEmailHtml(
  blocks: EmailBlock[],
  businessName: string,
  unsubscribeUrl: string,
  emailBgColor?: string
): string {
  const renderedBlocks = blocks.map(renderBlock).join("");
  const bgColor = emailBgColor || "#f8fafc";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(businessName)}</title>
</head>
<body style="margin:0;padding:0;background-color:${bgColor};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
    <div style="background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
      <div style="padding:32px 32px 16px;">
        ${renderedBlocks}
      </div>
    </div>
    <div style="text-align:center;padding:16px 0;">
      <p style="font-size:12px;color:#94a3b8;margin:0;">
        Sent via <a href="https://ghostroasting.co.uk" style="color:#94a3b8;">Ghost Roastery</a>
      </p>
      ${
        unsubscribeUrl
          ? `<p style="font-size:12px;color:#94a3b8;margin:8px 0 0;"><a href="${escapeHtml(unsubscribeUrl)}" style="color:#94a3b8;text-decoration:underline;">Unsubscribe</a></p>`
          : ""
      }
    </div>
  </div>
</body>
</html>`;
}

/** Render for preview thumbnail — no wrapper chrome, just the email card */
export function renderEmailHtmlForPreview(blocks: EmailBlock[], emailBgColor?: string): string {
  const renderedBlocks = blocks.map(renderBlock).join("");
  const bgColor = emailBgColor || "#f8fafc";
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>body{margin:0;padding:0;background:${bgColor};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;}</style>
</head>
<body>
  <div style="max-width:600px;margin:0 auto;padding:24px 12px;">
    <div style="background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
      <div style="padding:24px 24px 12px;">
        ${renderedBlocks}
      </div>
    </div>
  </div>
</body>
</html>`;
}

function renderBlock(block: EmailBlock): string {
  switch (block.type) {
    case "header": {
      const sizes: Record<number, string> = { 1: "28px", 2: "22px", 3: "18px" };
      const fontSize = sizes[block.data.level] || "28px";
      const color = block.data.color || "#0f172a";
      return `<h${block.data.level} style="margin:0 0 16px;font-size:${fontSize};font-weight:700;color:${escapeHtml(color)};text-align:${block.data.align};line-height:1.3;">${escapeHtml(block.data.text)}</h${block.data.level}>`;
    }

    case "text": {
      const align = block.data.align || "left";
      return `<div style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#334155;text-align:${align};">${block.data.html}</div>`;
    }

    case "image": {
      if (!block.data.src) return "";
      const widthStyle = block.data.width === "full"
        ? "width:100%;"
        : typeof block.data.width === "number"
        ? `width:${block.data.width}px;max-width:100%;`
        : "max-width:100%;";
      const br = block.data.borderRadius != null ? `border-radius:${block.data.borderRadius}px;` : "border-radius:8px;";
      const img = `<img src="${escapeHtml(block.data.src)}" alt="${escapeHtml(block.data.alt)}" style="${widthStyle}height:auto;${br}display:block;${block.data.align === "center" ? "margin:0 auto;" : ""}" />`;
      const wrapped = block.data.linkUrl
        ? `<a href="${escapeHtml(block.data.linkUrl)}" style="text-decoration:none;">${img}</a>`
        : img;
      return `<div style="margin:0 0 16px;text-align:${block.data.align};">${wrapped}</div>`;
    }

    case "button": {
      const bgColor = block.data.backgroundColor
        || (block.data.style === "filled" ? "#0083dc" : "transparent");
      const textColor = block.data.textColor
        || (block.data.style === "filled" ? "#ffffff" : "#0083dc");
      const border = block.data.style === "outline" ? `2px solid ${block.data.backgroundColor || "#0083dc"}` : "none";
      const br = block.data.borderRadius != null ? `${block.data.borderRadius}px` : "8px";
      return `<div style="margin:0 0 16px;text-align:${block.data.align};">
        <a href="${escapeHtml(block.data.url)}" style="display:inline-block;padding:12px 28px;background-color:${bgColor};color:${textColor};border:${border};border-radius:${br};font-weight:600;font-size:14px;text-decoration:none;line-height:1;">${escapeHtml(block.data.text)}</a>
      </div>`;
    }

    case "divider": {
      const color = block.data.color || "#e2e8f0";
      const thickness = block.data.thickness || 1;
      const widthMap: Record<string, string> = { full: "100%", half: "50%", third: "33%" };
      const width = widthMap[block.data.width || "full"] || "100%";
      return `<div style="margin:24px 0;text-align:center;"><hr style="border:none;border-top:${thickness}px solid ${escapeHtml(color)};margin:0 auto;width:${width};" /></div>`;
    }

    case "spacer":
      return `<div style="height:${block.data.height || 32}px;"></div>`;

    case "social": {
      const align = block.data.align || "center";
      const links: string[] = [];
      if (block.data.instagram) links.push(`<a href="${escapeHtml(block.data.instagram)}" style="color:#64748b;text-decoration:none;font-size:13px;margin:0 8px;">Instagram</a>`);
      if (block.data.facebook) links.push(`<a href="${escapeHtml(block.data.facebook)}" style="color:#64748b;text-decoration:none;font-size:13px;margin:0 8px;">Facebook</a>`);
      if (block.data.tiktok) links.push(`<a href="${escapeHtml(block.data.tiktok)}" style="color:#64748b;text-decoration:none;font-size:13px;margin:0 8px;">TikTok</a>`);
      if (block.data.twitter) links.push(`<a href="${escapeHtml(block.data.twitter)}" style="color:#64748b;text-decoration:none;font-size:13px;margin:0 8px;">Twitter</a>`);
      if (block.data.website) links.push(`<a href="${escapeHtml(block.data.website)}" style="color:#64748b;text-decoration:none;font-size:13px;margin:0 8px;">Website</a>`);
      if (links.length === 0) return "";
      return `<div style="text-align:${align};margin:0 0 16px;">${links.join(" · ")}</div>`;
    }

    case "footer": {
      const align = block.data.align || "center";
      return `<div style="text-align:${align};margin:16px 0 0;padding-top:16px;border-top:1px solid #e2e8f0;">
        <p style="font-size:13px;color:#94a3b8;margin:0;">${escapeHtml(block.data.text)}</p>
      </div>`;
    }

    case "product_grid":
      return `<div style="margin:0 0 16px;"><p style="font-size:14px;color:#94a3b8;text-align:center;">[Product grid — products will be rendered on send]</p></div>`;

    case "discount_code": {
      const dcBg = block.data.backgroundColor || "#059669";
      const dcText = block.data.textColor || "#ffffff";
      const dcCode = escapeHtml(block.data.code || "CODE");
      const dcDesc = block.data.description ? escapeHtml(block.data.description) : "";

      if (block.data.style === "minimal") {
        return `<div style="margin:0 0 16px;text-align:center;font-size:15px;color:#64748b;">
          Use code <span style="font-family:monospace;font-weight:700;color:${dcBg};background-color:${dcBg}15;padding:2px 8px;border-radius:4px;">${dcCode}</span>${dcDesc ? ` — ${dcDesc}` : ""}
        </div>`;
      }

      if (block.data.style === "banner") {
        return `<div style="margin:0 0 16px;background-color:${dcBg};color:${dcText};border-radius:8px;padding:16px;text-align:center;">
          <p style="margin:0;font-family:monospace;font-weight:700;font-size:22px;letter-spacing:2px;">${dcCode}</p>
          ${dcDesc ? `<p style="margin:6px 0 0;font-size:14px;opacity:0.9;">${dcDesc}</p>` : ""}
        </div>`;
      }

      // card (default)
      return `<div style="margin:0 0 16px;">
        <div style="border:2px dashed ${dcBg};border-radius:8px;padding:20px;text-align:center;">
          <p style="margin:0 0 8px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:${dcBg};">Your discount code</p>
          <p style="margin:0;display:inline-block;font-family:monospace;font-weight:700;font-size:22px;letter-spacing:2px;background-color:${dcBg};color:${dcText};padding:8px 20px;border-radius:6px;">${dcCode}</p>
          ${dcDesc ? `<p style="margin:10px 0 0;font-size:14px;color:#64748b;">${dcDesc}</p>` : ""}
        </div>
      </div>`;
    }

    default:
      return "";
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
