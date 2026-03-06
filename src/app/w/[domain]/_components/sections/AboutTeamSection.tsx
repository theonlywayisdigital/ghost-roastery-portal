"use client";

import { motion } from "framer-motion";
import type { AboutTeamSectionData, WebsiteTheme } from "@/lib/website-sections/types";

interface AboutTeamSectionProps {
  data: AboutTeamSectionData;
  theme: WebsiteTheme;
  isEditor?: boolean;
}

const ease = [0.21, 0.47, 0.32, 0.98] as const;

export function AboutTeamSection({ data, theme, isEditor }: AboutTeamSectionProps) {
  const Container = isEditor ? "div" : motion.section;
  const containerProps = isEditor ? {} : {
    initial: { opacity: 0, y: 40 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-50px" },
    transition: { duration: 0.6, ease },
  };

  return (
    <Container {...containerProps} className="py-16 md:py-24" style={{ backgroundColor: theme.backgroundColor }}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 md:mb-16">
          <h2
            className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight mb-4"
            style={{ color: theme.textColor, fontFamily: theme.headingFont }}
          >
            {data.heading}
          </h2>
          {data.subheading && (
            <p className="text-lg md:text-xl max-w-2xl mx-auto opacity-70" style={{ color: theme.textColor, fontFamily: theme.bodyFont }}>
              {data.subheading}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {data.members.map((member, i) => (
            <div key={i} className="text-center">
              <div className="w-32 h-32 mx-auto rounded-full overflow-hidden mb-4" style={{ backgroundColor: `${theme.primaryColor}15` }}>
                {member.image ? (
                  <img src={member.image} alt={member.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl font-bold" style={{ color: theme.primaryColor }}>
                    {member.name.charAt(0)}
                  </div>
                )}
              </div>
              <h3 className="text-lg font-bold mb-1" style={{ color: theme.textColor, fontFamily: theme.headingFont }}>
                {member.name}
              </h3>
              <p className="text-sm font-medium mb-2" style={{ color: theme.primaryColor }}>{member.role}</p>
              {member.bio && (
                <p className="text-sm opacity-70 max-w-xs mx-auto" style={{ color: theme.textColor, fontFamily: theme.bodyFont }}>
                  {member.bio}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </Container>
  );
}
