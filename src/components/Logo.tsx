import Image from "next/image";
import { sanityClient, urlFor, siteSettingsQuery } from "@/lib/sanity";

interface LogoProps {
  height?: number;
  className?: string;
}

export async function Logo({ height = 60, className }: LogoProps) {
  const settings = await sanityClient.fetch(siteSettingsQuery);
  const logoUrl = settings?.logo
    ? urlFor(settings.logo).height(height * 2).url()
    : null;

  if (logoUrl) {
    return (
      <Image
        src={logoUrl}
        alt="Ghost Roastery"
        width={height * 3}
        height={height}
        className={`${className || `h-[${height}px] w-auto`} invert`}
        priority
      />
    );
  }

  return (
    <span className="text-xl font-black tracking-tight text-slate-900">
      GHOST ROASTERY
    </span>
  );
}
