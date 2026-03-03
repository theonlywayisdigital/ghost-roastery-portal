/**
 * Server-side prompt builder for AI content generation.
 * Each function returns a system prompt and user prompt for the Anthropic API.
 */

export type GenerationType =
  | "email_subject"
  | "email_preview"
  | "email_body"
  | "social_caption"
  | "product_name"
  | "product_description"
  | "discount_description"
  | "form_description"
  | "form_success_message";

interface PromptContext {
  roasterName?: string;
  brandVoice?: string;
  existingContent?: string;
  campaignName?: string;
  platforms?: string[];
  productCategory?: string;
  discountType?: string;
  discountValue?: string;
  [key: string]: unknown;
}

interface BuiltPrompt {
  system: string;
  user: string;
}

const BASE_SYSTEM = `You are a marketing copywriter for a specialty coffee roaster. Write in a warm, professional, artisan tone. Be concise and punchy — no filler words. Never use emojis unless the user specifically asks for them. Return exactly 3 options, each on its own numbered line like:
1. [option one]
2. [option two]
3. [option three]

Do not include any other text, explanation, or commentary. Just the 3 numbered options.`;

function withBrand(ctx: PromptContext): string {
  const parts: string[] = [];
  if (ctx.roasterName) parts.push(`The roaster's brand is "${ctx.roasterName}".`);
  if (ctx.brandVoice) parts.push(`Brand voice notes: ${ctx.brandVoice}`);
  return parts.length > 0 ? "\n" + parts.join(" ") : "";
}

export function buildPrompt(
  type: GenerationType,
  userInstruction: string,
  context: PromptContext
): BuiltPrompt {
  const brand = withBrand(context);

  switch (type) {
    case "email_subject":
      return {
        system: BASE_SYSTEM + brand + "\nYou are writing email subject lines. Keep them under 60 characters. Make them compelling and clickable without being spammy.",
        user: buildUserPrompt("email subject lines", userInstruction, context),
      };

    case "email_preview":
      return {
        system: BASE_SYSTEM + brand + "\nYou are writing email preview text (the snippet visible in the inbox). Keep it under 100 characters. It should complement the subject line and entice the reader to open.",
        user: buildUserPrompt("email preview text snippets", userInstruction, context),
      };

    case "email_body":
      return {
        system: BASE_SYSTEM + brand + `\nYou are writing a short paragraph of email body copy. Keep each option to 2-3 sentences. Write in HTML with simple tags (<p>, <strong>, <em>) — no headings, no lists.`,
        user: buildUserPrompt("email body paragraphs", userInstruction, context),
      };

    case "social_caption":
      return {
        system: BASE_SYSTEM + brand + buildSocialConstraints(context.platforms),
        user: buildUserPrompt("social media captions", userInstruction, context),
      };

    case "product_name":
      return {
        system: BASE_SYSTEM + brand + "\nYou are naming a coffee product. Keep names short (2-5 words), evocative, and memorable. Think artisan coffee brand naming.",
        user: buildUserPrompt("product names", userInstruction, context),
      };

    case "product_description":
      return {
        system: BASE_SYSTEM + brand + "\nYou are writing a product description for a specialty coffee product. Keep it to 1-2 sentences. Highlight flavour notes, origin, or roast profile where relevant.",
        user: buildUserPrompt("product descriptions", userInstruction, context),
      };

    case "discount_description":
      return {
        system: BASE_SYSTEM + brand + "\nYou are writing a short promotional description for a discount or offer. Make it compelling and action-oriented. Keep to 1-2 sentences.",
        user: buildUserPrompt("discount/offer descriptions", userInstruction, context),
      };

    case "form_description":
      return {
        system: BASE_SYSTEM + brand + "\nYou are writing a brief description for a signup/contact form. It should tell visitors what they'll get by filling out the form. Keep to 1-2 sentences.",
        user: buildUserPrompt("form descriptions", userInstruction, context),
      };

    case "form_success_message":
      return {
        system: BASE_SYSTEM + brand + "\nYou are writing a success/thank-you message shown after form submission. Be warm and appreciative. Keep to 1-2 sentences.",
        user: buildUserPrompt("form success messages", userInstruction, context),
      };

    default:
      return {
        system: BASE_SYSTEM + brand,
        user: `Generate 3 options. User request: ${userInstruction}`,
      };
  }
}

function buildUserPrompt(
  what: string,
  userInstruction: string,
  ctx: PromptContext
): string {
  const parts: string[] = [`Generate 3 ${what}.`];

  if (userInstruction.trim()) {
    parts.push(`User request: "${userInstruction.trim()}"`);
  }

  if (ctx.existingContent) {
    parts.push(`Current content for reference: "${ctx.existingContent}"`);
  }
  if (ctx.campaignName) {
    parts.push(`Campaign name: "${ctx.campaignName}"`);
  }
  if (ctx.productCategory) {
    parts.push(`Product category: ${ctx.productCategory}`);
  }
  if (ctx.discountType && ctx.discountValue) {
    parts.push(`Discount: ${ctx.discountValue} ${ctx.discountType}`);
  }

  return parts.join("\n");
}

function buildSocialConstraints(platforms?: string[]): string {
  if (!platforms || platforms.length === 0) {
    return "\nYou are writing social media captions. Keep to 1-3 sentences. Make them engaging and shareable.";
  }

  const limits: Record<string, number> = {
    google_business: 1500,
    facebook: 63206,
    instagram: 2200,
  };

  const shortest = Math.min(...platforms.map((p) => limits[p] || 2200));
  return `\nYou are writing social media captions for: ${platforms.join(", ")}. Keep each option under ${shortest} characters. Make them engaging and shareable.`;
}
