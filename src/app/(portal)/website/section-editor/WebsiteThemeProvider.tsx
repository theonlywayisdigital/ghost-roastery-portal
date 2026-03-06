"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { WebsiteTheme } from "@/lib/website-sections/types";
import { defaultTheme } from "@/lib/website-sections/types";

const ThemeContext = createContext<WebsiteTheme>(defaultTheme);

export function useWebsiteTheme() {
  return useContext(ThemeContext);
}

interface WebsiteThemeProviderProps {
  theme: WebsiteTheme;
  children: ReactNode;
  className?: string;
}

export function WebsiteThemeProvider({ theme, children, className }: WebsiteThemeProviderProps) {
  const cssVars = {
    "--ws-primary": theme.primaryColor,
    "--ws-accent": theme.accentColor,
    "--ws-bg": theme.backgroundColor,
    "--ws-text": theme.textColor,
    "--ws-font-heading": theme.headingFont,
    "--ws-font-body": theme.bodyFont,
  } as React.CSSProperties;

  return (
    <ThemeContext.Provider value={theme}>
      <div style={cssVars} className={className}>{children}</div>
    </ThemeContext.Provider>
  );
}
