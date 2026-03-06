import type { WebBlock } from "./web-block-types";

export function renderWebHtml(blocks: WebBlock[]): string {
  const renderedBlocks = blocks.map(renderBlock).join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #0f172a; }
    .section { padding: 24px; }
    .prose p { margin: 0 0 1em; line-height: 1.7; color: #334155; }
    .prose a { color: #0083dc; text-decoration: underline; }
    .prose ul, .prose ol { padding-left: 1.5em; margin: 0 0 1em; }
    .prose li { margin: 0.25em 0; line-height: 1.7; color: #334155; }
    img { max-width: 100%; height: auto; }
    .grid { display: grid; }
  </style>
</head>
<body>
  ${renderedBlocks}
</body>
</html>`;
}

function renderBlock(block: WebBlock): string {
  switch (block.type) {
    case "hero": {
      const bgImage = block.data.backgroundImageUrl
        ? `background-image:url(${escapeHtml(block.data.backgroundImageUrl)});background-size:cover;background-position:center;`
        : "background-color:#1e293b;";
      const overlay = block.data.backgroundImageUrl
        ? `<div style="position:absolute;inset:0;background:rgba(0,0,0,${(block.data.backgroundOverlay || 40) / 100});"></div>`
        : "";
      return `<section style="position:relative;min-height:${block.data.minHeight || 400}px;display:flex;align-items:center;justify-content:center;${bgImage}text-align:${block.data.align || "center"};">
        ${overlay}
        <div style="position:relative;z-index:1;padding:48px 32px;max-width:640px;margin:0 auto;">
          <h1 style="font-size:2.5rem;font-weight:700;color:#ffffff;line-height:1.2;margin:0 0 12px;">${escapeHtml(block.data.heading)}</h1>
          <p style="font-size:1.125rem;color:rgba(255,255,255,0.8);margin:0 0 24px;">${escapeHtml(block.data.subheading)}</p>
          ${block.data.buttonText ? `<a href="${escapeHtml(block.data.buttonUrl)}" style="display:inline-block;padding:12px 28px;background:#ffffff;color:#0f172a;border-radius:8px;font-weight:600;font-size:14px;text-decoration:none;">${escapeHtml(block.data.buttonText)}</a>` : ""}
        </div>
      </section>`;
    }

    case "heading": {
      const sizes: Record<number, string> = { 1: "28px", 2: "22px", 3: "18px" };
      const fontSize = sizes[block.data.level] || "28px";
      const color = block.data.color || "#0f172a";
      return `<div class="section"><h${block.data.level} style="font-size:${fontSize};font-weight:700;color:${escapeHtml(color)};text-align:${block.data.align};line-height:1.3;margin:0;">${escapeHtml(block.data.text)}</h${block.data.level}></div>`;
    }

    case "text": {
      const align = block.data.align || "left";
      return `<div class="section prose" style="text-align:${align};">${block.data.html}</div>`;
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
      const caption = block.data.caption
        ? `<p style="font-size:12px;color:#94a3b8;margin:4px 0 0;text-align:${block.data.align};">${escapeHtml(block.data.caption)}</p>`
        : "";
      return `<div class="section" style="text-align:${block.data.align};">${wrapped}${caption}</div>`;
    }

    case "button": {
      const bgColor = block.data.backgroundColor || (block.data.style === "filled" ? "#0083dc" : "transparent");
      const textColor = block.data.textColor || (block.data.style === "filled" ? "#ffffff" : "#0083dc");
      const border = block.data.style === "outline" ? `2px solid ${block.data.backgroundColor || "#0083dc"}` : "none";
      const br = block.data.borderRadius != null ? `${block.data.borderRadius}px` : "8px";
      const padding = block.data.size === "sm" ? "8px 20px" : block.data.size === "lg" ? "16px 36px" : "12px 28px";
      return `<div class="section" style="text-align:${block.data.align};">
        <a href="${escapeHtml(block.data.url)}" style="display:inline-block;padding:${padding};background-color:${bgColor};color:${textColor};border:${border};border-radius:${br};font-weight:600;font-size:14px;text-decoration:none;line-height:1;">${escapeHtml(block.data.text)}</a>
      </div>`;
    }

    case "two_column": {
      const splits: Record<string, string> = {
        "50-50": "1fr 1fr",
        "33-67": "1fr 2fr",
        "67-33": "2fr 1fr",
      };
      const cols = splits[block.data.split] || "1fr 1fr";
      return `<div class="section" style="display:grid;grid-template-columns:${cols};gap:${block.data.gap || 24}px;">
        <div class="prose">${block.data.leftHtml}</div>
        <div class="prose">${block.data.rightHtml}</div>
      </div>`;
    }

    case "product_grid":
      return `<div class="section"><p style="font-size:14px;color:#94a3b8;text-align:center;">[Product grid — products rendered dynamically]</p></div>`;

    case "contact_form":
      return `<div class="section">
        <h3 style="font-size:1.125rem;font-weight:600;margin:0 0 16px;">${escapeHtml(block.data.heading)}</h3>
        <form style="max-width:480px;">
          ${block.data.fields.map((f) =>
            f === "message"
              ? `<div style="margin:0 0 12px;"><label style="display:block;font-size:12px;font-weight:500;color:#64748b;margin:0 0 4px;text-transform:capitalize;">${f}</label><textarea style="width:100%;min-height:80px;padding:8px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;" placeholder="Your ${f}"></textarea></div>`
              : `<div style="margin:0 0 12px;"><label style="display:block;font-size:12px;font-weight:500;color:#64748b;margin:0 0 4px;text-transform:capitalize;">${f}</label><input style="width:100%;padding:8px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;" placeholder="Your ${f}" /></div>`
          ).join("")}
          <button type="submit" style="padding:10px 24px;background:#0f172a;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:500;cursor:pointer;">${escapeHtml(block.data.submitText)}</button>
        </form>
      </div>`;

    case "spacer":
      return `<div style="height:${block.data.height || 48}px;"></div>`;

    case "divider": {
      const color = block.data.color || "#e2e8f0";
      const thickness = block.data.thickness || 1;
      const widthMap: Record<string, string> = { full: "100%", half: "50%", third: "33%" };
      const width = widthMap[block.data.width || "full"] || "100%";
      return `<div class="section"><hr style="border:none;border-top:${thickness}px solid ${escapeHtml(color)};width:${width};margin:0 auto;" /></div>`;
    }

    case "testimonial": {
      const align = block.data.align || "center";
      const avatar = block.data.imageUrl
        ? `<img src="${escapeHtml(block.data.imageUrl)}" alt="${escapeHtml(block.data.author)}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;margin-right:12px;" />`
        : "";
      return `<div class="section" style="text-align:${align};">
        <blockquote style="max-width:480px;margin:0 auto;">
          <p style="font-size:1.125rem;font-style:italic;color:#334155;line-height:1.7;margin:0 0 12px;">"${escapeHtml(block.data.quote)}"</p>
          <div style="display:flex;align-items:center;justify-content:${align};">
            ${avatar}
            <div>
              <p style="font-size:14px;font-weight:600;color:#0f172a;margin:0;">${escapeHtml(block.data.author)}</p>
              ${block.data.role ? `<p style="font-size:12px;color:#94a3b8;margin:2px 0 0;">${escapeHtml(block.data.role)}</p>` : ""}
            </div>
          </div>
        </blockquote>
      </div>`;
    }

    case "gallery": {
      if (block.data.images.length === 0) return "";
      const imgs = block.data.images.map((img) =>
        `<img src="${escapeHtml(img.src)}" alt="${escapeHtml(img.alt)}" style="width:100%;height:auto;object-fit:cover;border-radius:${block.data.borderRadius}px;" />`
      ).join("");
      return `<div class="section" style="display:grid;grid-template-columns:repeat(${block.data.columns},1fr);gap:${block.data.gap}px;">${imgs}</div>`;
    }

    case "video": {
      if (!block.data.url) return "";
      const embedUrl = getVideoEmbedUrl(block.data.url);
      if (!embedUrl) return `<div class="section"><p style="color:#94a3b8;text-align:center;">Invalid video URL</p></div>`;
      const ratios: Record<string, string> = { "16:9": "56.25%", "4:3": "75%", "1:1": "100%" };
      const pb = ratios[block.data.aspectRatio] || "56.25%";
      return `<div class="section"><div style="position:relative;padding-bottom:${pb};height:0;overflow:hidden;border-radius:8px;">
        <iframe src="${escapeHtml(embedUrl)}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;" allowfullscreen></iframe>
      </div></div>`;
    }

    case "map": {
      if (!block.data.address) return "";
      const q = encodeURIComponent(block.data.address);
      return `<div class="section"><iframe src="https://maps.google.com/maps?q=${q}&z=${block.data.zoom || 14}&output=embed" style="width:100%;height:${block.data.height || 300}px;border:0;border-radius:8px;" allowfullscreen loading="lazy"></iframe></div>`;
    }

    default:
      return "";
  }
}

function getVideoEmbedUrl(url: string): string | null {
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;

  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;

  return null;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
