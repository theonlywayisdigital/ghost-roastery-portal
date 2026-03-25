import Image from "next/image";

const SUPABASE_ASSETS =
  "https://zaryzynzbpxmscggufdc.supabase.co/storage/v1/object/public/assets";

const LOGO_URLS = {
  main: `${SUPABASE_ASSETS}/logo-main.png`,
  stacked: `${SUPABASE_ASSETS}/logo-stacked.png`,
  white: `${SUPABASE_ASSETS}/logo-white.png`,
} as const;

interface LogoProps {
  variant?: keyof typeof LOGO_URLS;
  height?: number;
  className?: string;
}

export function Logo({ variant = "main", height = 60, className }: LogoProps) {
  const src = LOGO_URLS[variant];
  const aspectRatio = variant === "stacked" ? 1 : 1.6;

  return (
    <Image
      src={src}
      alt="Roastery Platform"
      width={Math.round(height * aspectRatio)}
      height={height}
      className={className || undefined}
      style={{ height, width: "auto" }}
      priority
    />
  );
}
