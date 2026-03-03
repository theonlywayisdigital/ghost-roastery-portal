export function isLightColour(hex: string): boolean {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6;
}

export function getSocialUrl(type: string, handle: string): string {
  if (handle.startsWith("http")) return handle;
  const clean = handle.replace(/^@/, "");
  if (type === "instagram") return `https://instagram.com/${clean}`;
  if (type === "tiktok") return `https://tiktok.com/@${clean}`;
  return handle;
}
