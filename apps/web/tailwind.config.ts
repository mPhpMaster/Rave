import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "#0B0B10",
          secondary: "#14141B",
          elevated: "#1B1B24",
          hover: "#232331"
        },
        ink: {
          DEFAULT: "#FFFFFF",
          secondary: "#B3B3C2",
          muted: "#6B7280"
        },
        purple: {
          DEFAULT: "#8B5CF6",
          dark: "#7C3AED"
        },
        pink: {
          DEFAULT: "#EC4899"
        },
        electric: "#3B82F6",
        success: "#10B981",
        brand: {
          DEFAULT: "#8B5CF6",
          dark: "#7C3AED"
        }
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      borderRadius: {
        xs: "8px",
        pill: "999px"
      },
      backdropBlur: {
        glass: "18px",
        panel: "20px"
      },
      boxShadow: {
        "glow-purple": "0 0 30px rgba(139,92,246,0.18)",
        "glow-pink": "0 0 30px rgba(236,72,153,0.18)",
        elev: "0 4px 24px rgba(0,0,0,0.4)"
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)"
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" }
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(139,92,246,0.18)" },
          "50%": { boxShadow: "0 0 35px rgba(236,72,153,0.32)" }
        }
      },
      animation: {
        "fade-in": "fade-in 300ms ease-out",
        "slide-up": "slide-up 280ms ease-out",
        "glow-pulse": "glow-pulse 2.6s ease-in-out infinite"
      }
    }
  },
  plugins: []
};

export default config;
