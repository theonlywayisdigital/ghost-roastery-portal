import type { EmailBlock, EmailBlockType } from "@/types/marketing";

export function generateId(): string {
  return Math.random().toString(36).slice(2, 8);
}

export function createDefaultBlock(type: EmailBlockType): EmailBlock {
  const id = generateId();
  switch (type) {
    case "header":
      return { id, type: "header", data: { text: "Heading", level: 1, align: "center" } };
    case "text":
      return { id, type: "text", data: { html: "<p>Your text here...</p>" } };
    case "image":
      return { id, type: "image", data: { src: "", alt: "", align: "center" } };
    case "button":
      return { id, type: "button", data: { text: "Click Here", url: "", align: "center", style: "filled" } };
    case "divider":
      return { id, type: "divider", data: {} };
    case "spacer":
      return { id, type: "spacer", data: { height: 32 } };
    case "social":
      return { id, type: "social", data: {} };
    case "footer":
      return { id, type: "footer", data: { text: "Your business name" } };
    case "product_grid":
      return { id, type: "product_grid", data: { productIds: [], columns: 2 } };
    case "discount_code":
      return { id, type: "discount_code", data: { code: "DISCOUNT", description: "Use this code at checkout", style: "card" } };
    default:
      return { id, type: "text", data: { html: "" } } as EmailBlock;
  }
}
