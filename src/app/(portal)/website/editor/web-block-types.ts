// ═══════════════════════════════════════════════════════════
// Web Page Block Types (website page builder)
// ═══════════════════════════════════════════════════════════

export type WebBlockType =
  | "hero"
  | "heading"
  | "text"
  | "image"
  | "button"
  | "two_column"
  | "product_grid"
  | "contact_form"
  | "spacer"
  | "divider"
  | "testimonial"
  | "gallery"
  | "video"
  | "map";

export interface WebBlockBase {
  id: string;
  type: WebBlockType;
}

export interface HeroBlockData {
  heading: string;
  subheading: string;
  buttonText: string;
  buttonUrl: string;
  backgroundImageUrl: string;
  backgroundOverlay: number; // 0-100 opacity
  align: "left" | "center" | "right";
  minHeight: number;
}

export interface HeadingBlockData {
  text: string;
  level: 1 | 2 | 3;
  align: "left" | "center" | "right";
  color?: string;
}

export interface WebTextBlockData {
  html: string;
  align?: "left" | "center" | "right";
}

export interface WebImageBlockData {
  src: string;
  alt: string;
  align: "left" | "center" | "right";
  linkUrl?: string;
  width?: "auto" | "full" | number;
  borderRadius?: number;
  caption?: string;
}

export interface WebButtonBlockData {
  text: string;
  url: string;
  align: "left" | "center" | "right";
  style: "filled" | "outline";
  backgroundColor?: string;
  textColor?: string;
  borderRadius?: number;
  size: "sm" | "md" | "lg";
}

export interface TwoColumnBlockData {
  leftHtml: string;
  rightHtml: string;
  split: "50-50" | "33-67" | "67-33";
  gap: number;
}

export interface WebProductGridBlockData {
  columns: 2 | 3 | 4;
  limit: number;
  showPrice: boolean;
  showButton: boolean;
}

export interface ContactFormBlockData {
  heading: string;
  fields: ("name" | "email" | "phone" | "message")[];
  submitText: string;
  successMessage: string;
}

export interface WebSpacerBlockData {
  height: number;
}

export interface WebDividerBlockData {
  color?: string;
  thickness?: number;
  width?: "full" | "half" | "third";
}

export interface TestimonialBlockData {
  quote: string;
  author: string;
  role?: string;
  imageUrl?: string;
  align: "left" | "center";
}

export interface GalleryBlockData {
  images: { src: string; alt: string }[];
  columns: 2 | 3 | 4;
  gap: number;
  borderRadius: number;
}

export interface VideoBlockData {
  url: string; // YouTube/Vimeo URL
  aspectRatio: "16:9" | "4:3" | "1:1";
}

export interface MapBlockData {
  address: string;
  height: number;
  zoom: number;
}

export type WebBlock =
  | (WebBlockBase & { type: "hero"; data: HeroBlockData })
  | (WebBlockBase & { type: "heading"; data: HeadingBlockData })
  | (WebBlockBase & { type: "text"; data: WebTextBlockData })
  | (WebBlockBase & { type: "image"; data: WebImageBlockData })
  | (WebBlockBase & { type: "button"; data: WebButtonBlockData })
  | (WebBlockBase & { type: "two_column"; data: TwoColumnBlockData })
  | (WebBlockBase & { type: "product_grid"; data: WebProductGridBlockData })
  | (WebBlockBase & { type: "contact_form"; data: ContactFormBlockData })
  | (WebBlockBase & { type: "spacer"; data: WebSpacerBlockData })
  | (WebBlockBase & { type: "divider"; data: WebDividerBlockData })
  | (WebBlockBase & { type: "testimonial"; data: TestimonialBlockData })
  | (WebBlockBase & { type: "gallery"; data: GalleryBlockData })
  | (WebBlockBase & { type: "video"; data: VideoBlockData })
  | (WebBlockBase & { type: "map"; data: MapBlockData });
