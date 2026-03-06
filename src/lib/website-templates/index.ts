export { modernMinimalTemplate } from "./modern-minimal";
export { classicTraditionalTemplate } from "./classic-traditional";

export const templateOptions = [
  {
    id: "modern-minimal",
    name: "Modern Minimal",
    description: "Clean, contemporary design with bold typography and generous whitespace. Perfect for specialty roasters.",
  },
  {
    id: "classic-traditional",
    name: "Classic Traditional",
    description: "Warm, heritage-focused design with rich storytelling. Ideal for established or craft-focused roasters.",
  },
] as const;

export type TemplateId = (typeof templateOptions)[number]["id"];
