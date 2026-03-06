import type { WebBlock, WebBlockType } from "./web-block-types";

export function generateId(): string {
  return Math.random().toString(36).slice(2, 8);
}

export function createDefaultWebBlock(type: WebBlockType): WebBlock {
  const id = generateId();
  switch (type) {
    case "hero":
      return { id, type: "hero", data: { heading: "Welcome", subheading: "Your tagline here", buttonText: "Shop Now", buttonUrl: "/shop", backgroundImageUrl: "", backgroundOverlay: 40, align: "center", minHeight: 400 } };
    case "heading":
      return { id, type: "heading", data: { text: "Heading", level: 2, align: "center" } };
    case "text":
      return { id, type: "text", data: { html: "<p>Your text here...</p>" } };
    case "image":
      return { id, type: "image", data: { src: "", alt: "", align: "center" } };
    case "button":
      return { id, type: "button", data: { text: "Click Here", url: "", align: "center", style: "filled", size: "md" } };
    case "two_column":
      return { id, type: "two_column", data: { leftHtml: "<p>Left column</p>", rightHtml: "<p>Right column</p>", split: "50-50", gap: 24 } };
    case "product_grid":
      return { id, type: "product_grid", data: { columns: 3, limit: 6, showPrice: true, showButton: true } };
    case "contact_form":
      return { id, type: "contact_form", data: { heading: "Get in Touch", fields: ["name", "email", "message"], submitText: "Send Message", successMessage: "Thanks! We'll be in touch soon." } };
    case "spacer":
      return { id, type: "spacer", data: { height: 48 } };
    case "divider":
      return { id, type: "divider", data: {} };
    case "testimonial":
      return { id, type: "testimonial", data: { quote: "This is the best coffee I've ever had.", author: "Customer Name", role: "", imageUrl: "", align: "center" } };
    case "gallery":
      return { id, type: "gallery", data: { images: [], columns: 3, gap: 8, borderRadius: 8 } };
    case "video":
      return { id, type: "video", data: { url: "", aspectRatio: "16:9" } };
    case "map":
      return { id, type: "map", data: { address: "", height: 300, zoom: 14 } };
    default:
      return { id, type: "text", data: { html: "" } } as WebBlock;
  }
}
