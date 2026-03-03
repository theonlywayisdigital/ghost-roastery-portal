import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        border: "var(--border)",
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        destructive: "var(--destructive)",
        brand: {
          50: "#e6f3fc",
          100: "#b3dbf7",
          200: "#80c3f1",
          300: "#4dabec",
          400: "#1a93e6",
          500: "#0083dc",
          600: "#0073c2",
          700: "#005f9f",
          800: "#004a7c",
          900: "#003559",
        },
      },
    },
  },
  plugins: [],
};
export default config;
