import type { WebSection } from "./types";
import { createDefaultSection } from "./defaults";

/**
 * Best-effort migration of old WebBlock[] format to new WebSection[] format.
 * Used to convert legacy page content stored in the database.
 *
 * Old format: Array of { type: string, content: object, design: object }
 * New format: WebSection discriminated union with typed data
 */

interface LegacyBlock {
  type: string;
  content?: Record<string, unknown>;
  design?: Record<string, unknown>;
}

export function migrateBlocksToSections(blocks: unknown): WebSection[] {
  if (!Array.isArray(blocks)) return [];

  // If the array already has items with a `visible` property, it's already the new format
  if (blocks.length > 0 && typeof blocks[0] === "object" && blocks[0] !== null && "visible" in blocks[0]) {
    return blocks as WebSection[];
  }

  const sections: WebSection[] = [];

  for (const block of blocks) {
    if (typeof block !== "object" || block === null) continue;
    const b = block as LegacyBlock;
    const section = convertBlock(b);
    if (section) sections.push(section);
  }

  // If nothing converted, return a default hero so the page isn't blank
  if (sections.length === 0) {
    sections.push(createDefaultSection("hero"));
  }

  return sections;
}

function convertBlock(block: LegacyBlock): WebSection | null {
  const c = block.content ?? {};

  switch (block.type) {
    case "hero": {
      const section = createDefaultSection("hero");
      if (section.type !== "hero") return section;
      section.heading = String(c.title ?? c.heading ?? section.heading);
      section.subheading = String(c.subtitle ?? c.subheading ?? section.subheading);
      if (c.backgroundImage) section.backgroundImage = String(c.backgroundImage);
      if (c.buttonText) section.primaryButton = { text: String(c.buttonText), url: String(c.buttonLink ?? "/shop") };
      return section;
    }

    case "heading":
    case "text": {
      const section = createDefaultSection("text_content");
      if (section.type !== "text_content") return section;
      section.heading = String(c.title ?? c.heading ?? "");
      section.body = String(c.text ?? c.body ?? c.content ?? "");
      return section;
    }

    case "image": {
      const section = createDefaultSection("image_gallery");
      if (section.type !== "image_gallery") return section;
      if (c.url || c.src) {
        section.images = [{ url: String(c.url ?? c.src), alt: String(c.alt ?? "") }];
      }
      return section;
    }

    case "product_grid": {
      const section = createDefaultSection("featured_products");
      if (section.type !== "featured_products") return section;
      if (c.heading) section.heading = String(c.heading);
      if (typeof c.maxProducts === "number") section.maxProducts = c.maxProducts;
      return section;
    }

    case "testimonial": {
      const section = createDefaultSection("testimonials");
      if (section.type !== "testimonials") return section;
      if (c.heading) section.heading = String(c.heading);
      if (Array.isArray(c.items)) {
        section.testimonials = c.items.map((item: Record<string, unknown>) => ({
          quote: String(item.quote ?? ""),
          author: String(item.author ?? ""),
          role: String(item.role ?? ""),
          rating: typeof item.rating === "number" ? item.rating : 5,
        }));
      }
      return section;
    }

    case "contact_form": {
      return createDefaultSection("contact_form");
    }

    case "button": {
      const section = createDefaultSection("cta_banner");
      if (section.type !== "cta_banner") return section;
      section.heading = String(c.heading ?? "");
      section.button = { text: String(c.text ?? c.buttonText ?? "Click Here"), url: String(c.url ?? c.link ?? "/") };
      return section;
    }

    case "spacer":
    case "divider":
      // Skip layout-only blocks
      return null;

    case "gallery": {
      const section = createDefaultSection("image_gallery");
      if (section.type !== "image_gallery") return section;
      if (Array.isArray(c.images)) {
        section.images = c.images.map((img: Record<string, unknown>) => ({
          url: String(img.url ?? img.src ?? ""),
          alt: String(img.alt ?? ""),
        }));
      }
      return section;
    }

    case "video": {
      // Convert to custom HTML with embedded video
      const section = createDefaultSection("custom_html");
      if (section.type !== "custom_html") return section;
      const url = String(c.url ?? c.src ?? "");
      if (url) {
        section.html = `<div style="position:relative;padding-bottom:56.25%;height:0"><iframe src="${url}" style="position:absolute;top:0;left:0;width:100%;height:100%" frameborder="0" allowfullscreen></iframe></div>`;
      }
      return section;
    }

    case "map": {
      const section = createDefaultSection("contact_form");
      if (section.type !== "contact_form") return section;
      section.showMap = true;
      section.mapAddress = String(c.address ?? c.location ?? "");
      return section;
    }

    default:
      return null;
  }
}
