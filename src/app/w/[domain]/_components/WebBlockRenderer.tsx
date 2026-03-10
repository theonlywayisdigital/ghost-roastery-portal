"use client";

import type { WebBlock } from "@/app/(portal)/website/editor/web-block-types";
import { useWebsiteTheme } from "@/app/(portal)/website/section-editor/WebsiteThemeProvider";

interface WebBlockRendererProps {
  blocks: WebBlock[];
}

export function WebBlockRenderer({ blocks }: WebBlockRendererProps) {
  const theme = useWebsiteTheme();

  if (!blocks || blocks.length === 0) return null;

  return (
    <div style={{ fontFamily: `'${theme.bodyFont}', sans-serif` }}>
      {blocks.map((block) => (
        <BlockRenderer key={block.id} block={block} headingFont={theme.headingFont} />
      ))}
    </div>
  );
}

function BlockRenderer({ block, headingFont }: { block: WebBlock; headingFont: string }) {
  switch (block.type) {
    case "hero": {
      const bgImage = block.data.backgroundImageUrl
        ? { backgroundImage: `url(${block.data.backgroundImageUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
        : { backgroundColor: "#1e293b" };
      const overlay = block.data.backgroundImageUrl ? (block.data.backgroundOverlay || 40) / 100 : 0;
      return (
        <section
          style={{
            position: "relative",
            minHeight: block.data.minHeight || 400,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: block.data.align || "center",
            ...bgImage,
          }}
        >
          {overlay > 0 && (
            <div style={{ position: "absolute", inset: 0, background: `rgba(0,0,0,${overlay})` }} />
          )}
          <div style={{ position: "relative", zIndex: 1, padding: "48px 32px", maxWidth: 640, margin: "0 auto" }}>
            <h1 style={{ fontSize: "2.5rem", fontWeight: 700, color: "#fff", lineHeight: 1.2, margin: "0 0 12px", fontFamily: `'${headingFont}', sans-serif` }}>
              {block.data.heading}
            </h1>
            <p style={{ fontSize: "1.125rem", color: "rgba(255,255,255,0.8)", margin: "0 0 24px" }}>
              {block.data.subheading}
            </p>
            {block.data.buttonText && (
              <a
                href={block.data.buttonUrl}
                style={{
                  display: "inline-block",
                  padding: "12px 28px",
                  background: "#ffffff",
                  color: "#0f172a",
                  borderRadius: 8,
                  fontWeight: 600,
                  fontSize: 14,
                  textDecoration: "none",
                }}
              >
                {block.data.buttonText}
              </a>
            )}
          </div>
        </section>
      );
    }

    case "heading": {
      const sizes: Record<number, string> = { 1: "28px", 2: "22px", 3: "18px" };
      const Tag = `h${block.data.level}` as keyof JSX.IntrinsicElements;
      return (
        <div style={{ padding: 24 }}>
          <Tag
            style={{
              fontSize: sizes[block.data.level] || "28px",
              fontWeight: 700,
              color: block.data.color || "#0f172a",
              textAlign: block.data.align,
              lineHeight: 1.3,
              margin: 0,
              fontFamily: `'${headingFont}', sans-serif`,
            }}
          >
            {block.data.text}
          </Tag>
        </div>
      );
    }

    case "text":
      return (
        <div
          className="prose"
          style={{ padding: 24, textAlign: block.data.align || "left" }}
          dangerouslySetInnerHTML={{ __html: block.data.html }}
        />
      );

    case "image": {
      if (!block.data.src) return null;
      const widthStyle: React.CSSProperties =
        block.data.width === "full"
          ? { width: "100%" }
          : typeof block.data.width === "number"
          ? { width: block.data.width, maxWidth: "100%" }
          : { maxWidth: "100%" };
      const br = block.data.borderRadius != null ? block.data.borderRadius : 8;
      const img = (
        <img
          src={block.data.src}
          alt={block.data.alt}
          style={{
            ...widthStyle,
            height: "auto",
            borderRadius: br,
            display: "block",
            ...(block.data.align === "center" ? { margin: "0 auto" } : {}),
          }}
        />
      );
      return (
        <div style={{ padding: 24, textAlign: block.data.align }}>
          {block.data.linkUrl ? (
            <a href={block.data.linkUrl} style={{ textDecoration: "none" }}>{img}</a>
          ) : (
            img
          )}
          {block.data.caption && (
            <p style={{ fontSize: 12, color: "#94a3b8", margin: "4px 0 0", textAlign: block.data.align }}>
              {block.data.caption}
            </p>
          )}
        </div>
      );
    }

    case "button": {
      const bgColor = block.data.backgroundColor || (block.data.style === "filled" ? "#0083dc" : "transparent");
      const textColor = block.data.textColor || (block.data.style === "filled" ? "#ffffff" : "#0083dc");
      const border = block.data.style === "outline" ? `2px solid ${block.data.backgroundColor || "#0083dc"}` : "none";
      const br = block.data.borderRadius != null ? block.data.borderRadius : 8;
      const padding = block.data.size === "sm" ? "8px 20px" : block.data.size === "lg" ? "16px 36px" : "12px 28px";
      return (
        <div style={{ padding: 24, textAlign: block.data.align }}>
          <a
            href={block.data.url}
            style={{
              display: "inline-block",
              padding,
              backgroundColor: bgColor,
              color: textColor,
              border,
              borderRadius: br,
              fontWeight: 600,
              fontSize: 14,
              textDecoration: "none",
              lineHeight: 1,
            }}
          >
            {block.data.text}
          </a>
        </div>
      );
    }

    case "two_column": {
      const splits: Record<string, string> = { "50-50": "1fr 1fr", "33-67": "1fr 2fr", "67-33": "2fr 1fr" };
      return (
        <div
          style={{
            padding: 24,
            display: "grid",
            gridTemplateColumns: splits[block.data.split] || "1fr 1fr",
            gap: block.data.gap || 24,
          }}
        >
          <div className="prose" dangerouslySetInnerHTML={{ __html: block.data.leftHtml }} />
          <div className="prose" dangerouslySetInnerHTML={{ __html: block.data.rightHtml }} />
        </div>
      );
    }

    case "spacer":
      return <div style={{ height: block.data.height || 48 }} />;

    case "divider": {
      const color = block.data.color || "#e2e8f0";
      const thickness = block.data.thickness || 1;
      const widthMap: Record<string, string> = { full: "100%", half: "50%", third: "33%" };
      const width = widthMap[block.data.width || "full"] || "100%";
      return (
        <div style={{ padding: 24 }}>
          <hr style={{ border: "none", borderTop: `${thickness}px solid ${color}`, width, margin: "0 auto" }} />
        </div>
      );
    }

    case "testimonial": {
      const align = block.data.align || "center";
      return (
        <div style={{ padding: 24, textAlign: align }}>
          <blockquote style={{ maxWidth: 480, margin: "0 auto" }}>
            <p style={{ fontSize: "1.125rem", fontStyle: "italic", color: "#334155", lineHeight: 1.7, margin: "0 0 12px" }}>
              {`"${block.data.quote}"`}
            </p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: align }}>
              {block.data.imageUrl && (
                <img
                  src={block.data.imageUrl}
                  alt={block.data.author}
                  style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", marginRight: 12 }}
                />
              )}
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", margin: 0 }}>{block.data.author}</p>
                {block.data.role && (
                  <p style={{ fontSize: 12, color: "#94a3b8", margin: "2px 0 0" }}>{block.data.role}</p>
                )}
              </div>
            </div>
          </blockquote>
        </div>
      );
    }

    case "gallery": {
      if (block.data.images.length === 0) return null;
      return (
        <div
          style={{
            padding: 24,
            display: "grid",
            gridTemplateColumns: `repeat(${block.data.columns}, 1fr)`,
            gap: block.data.gap,
          }}
        >
          {block.data.images.map((img, i) => (
            <img
              key={i}
              src={img.src}
              alt={img.alt}
              style={{ width: "100%", height: "auto", objectFit: "cover", borderRadius: block.data.borderRadius }}
            />
          ))}
        </div>
      );
    }

    case "video": {
      if (!block.data.url) return null;
      const embedUrl = getVideoEmbedUrl(block.data.url);
      if (!embedUrl) return <div style={{ padding: 24 }}><p style={{ color: "#94a3b8", textAlign: "center" }}>Invalid video URL</p></div>;
      const ratios: Record<string, string> = { "16:9": "56.25%", "4:3": "75%", "1:1": "100%" };
      const pb = ratios[block.data.aspectRatio] || "56.25%";
      return (
        <div style={{ padding: 24 }}>
          <div style={{ position: "relative", paddingBottom: pb, height: 0, overflow: "hidden", borderRadius: 8 }}>
            <iframe
              src={embedUrl}
              style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: 0 }}
              allowFullScreen
            />
          </div>
        </div>
      );
    }

    case "map": {
      if (!block.data.address) return null;
      const q = encodeURIComponent(block.data.address);
      return (
        <div style={{ padding: 24 }}>
          <iframe
            src={`https://maps.google.com/maps?q=${q}&z=${block.data.zoom || 14}&output=embed`}
            style={{ width: "100%", height: block.data.height || 300, border: 0, borderRadius: 8 }}
            allowFullScreen
            loading="lazy"
          />
        </div>
      );
    }

    case "product_grid":
    case "contact_form":
      return (
        <div style={{ padding: 24 }}>
          <p style={{ fontSize: 14, color: "#94a3b8", textAlign: "center" }}>
            {`[${block.type === "product_grid" ? "Product grid" : "Contact form"} — rendered dynamically]`}
          </p>
        </div>
      );

    default:
      return null;
  }
}

function getVideoEmbedUrl(url: string): string | null {
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  return null;
}
