import Image from "next/image";

const PLATFORM_LOGO_URL =
  "https://zaryzynzbpxmscggufdc.supabase.co/storage/v1/object/public/assets/platform-logo-v2.png";

interface LogoProps {
  height?: number;
  className?: string;
}

export function Logo({ height = 60, className }: LogoProps) {
  return (
    <Image
      src={PLATFORM_LOGO_URL}
      alt="Ghost Roastery Platform"
      width={Math.round(height * 1.6)}
      height={height}
      className={className || undefined}
      style={{ height, width: "auto" }}
      priority
    />
  );
}
