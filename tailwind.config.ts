import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // UpBoost Neon Command Design System
        brand: {
          bg: "#0a0e17",        // Deep space black
          "bg-alt": "#0f1420",  // Slightly lighter for layering
          card: "#141a28",      // Card surfaces
          "card-hover": "#1a2235",
          accent: "#FFD300",    // Electric yellow
          "accent-dim": "#b39500",
          glow: "rgba(255, 211, 0, 0.15)",
          "glow-strong": "rgba(255, 211, 0, 0.3)",
        },
        text: {
          primary: "#FFFFFF",
          secondary: "#7a8599",
          tertiary: "#4a5568",
          dark: "#0a0e17",
        },
        stage: {
          novos: "#3b82f6",
          contato: "#f59e0b",
          "vendido-unico": "#10b981",
          "vendido-mensal": "#06d6a0",
          perdido: "#ef4444",
        },
        border: "rgba(255, 255, 255, 0.08)",
        input: "rgba(255, 255, 255, 0.1)",
        ring: "#FFD300",
        background: "#0a0e17",
        foreground: "#FFFFFF",
        primary: {
          DEFAULT: "#FFD300",
          foreground: "#0a0e17",
        },
        secondary: {
          DEFAULT: "#141a28",
          foreground: "#FFFFFF",
        },
        destructive: {
          DEFAULT: "#ef4444",
          foreground: "#FFFFFF",
        },
        muted: {
          DEFAULT: "#1a2235",
          foreground: "#7a8599",
        },
        accent: {
          DEFAULT: "#FFD300",
          foreground: "#0a0e17",
        },
        popover: {
          DEFAULT: "#141a28",
          foreground: "#FFFFFF",
        },
        card: {
          DEFAULT: "#141a28",
          foreground: "#FFFFFF",
        },
      },
      borderRadius: {
        lg: "1rem",
        md: "0.75rem",
        sm: "0.5rem",
      },
      fontFamily: {
        sans: ["Outfit", "system-ui", "sans-serif"],
        display: ["Syne", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      boxShadow: {
        "glow-sm": "0 0 15px rgba(255, 211, 0, 0.15)",
        "glow": "0 0 30px rgba(255, 211, 0, 0.2)",
        "glow-lg": "0 0 50px rgba(255, 211, 0, 0.25)",
        "glow-intense": "0 0 60px rgba(255, 211, 0, 0.4)",
        "inner-glow": "inset 0 0 30px rgba(255, 211, 0, 0.1)",
        "card": "0 4px 30px rgba(0, 0, 0, 0.3)",
        "card-hover": "0 8px 40px rgba(0, 0, 0, 0.4)",
        "stage-novos": "0 0 20px rgba(59, 130, 246, 0.3)",
        "stage-contato": "0 0 20px rgba(245, 158, 11, 0.3)",
        "stage-vendido": "0 0 20px rgba(16, 185, 129, 0.3)",
        "stage-perdido": "0 0 20px rgba(239, 68, 68, 0.3)",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-mesh": "radial-gradient(at 40% 20%, rgba(255, 211, 0, 0.08) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(59, 130, 246, 0.06) 0px, transparent 50%), radial-gradient(at 0% 50%, rgba(16, 185, 129, 0.05) 0px, transparent 50%)",
        "grid-pattern": "linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px)",
        "noise": "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E\")",
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-out",
        "fade-in-up": "fadeInUp 0.6s ease-out",
        "fade-in-down": "fadeInDown 0.5s ease-out",
        "slide-in-left": "slideInLeft 0.4s ease-out",
        "slide-in-right": "slideInRight 0.4s ease-out",
        "scale-in": "scaleIn 0.3s ease-out",
        "glow-pulse": "glowPulse 2s ease-in-out infinite",
        "float": "float 6s ease-in-out infinite",
        "shimmer": "shimmer 2s linear infinite",
        "counter": "counter 1.5s ease-out",
        "progress": "progress 1s ease-out",
        "card-enter": "cardEnter 0.4s ease-out",
        "metric-pop": "metricPop 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeInDown: {
          "0%": { opacity: "0", transform: "translateY(-20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInLeft: {
          "0%": { opacity: "0", transform: "translateX(-30px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(30px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.9)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        glowPulse: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(255, 211, 0, 0.2)" },
          "50%": { boxShadow: "0 0 40px rgba(255, 211, 0, 0.4)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        counter: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        progress: {
          "0%": { width: "0%" },
          "100%": { width: "var(--progress-width)" },
        },
        cardEnter: {
          "0%": { opacity: "0", transform: "translateY(10px) scale(0.98)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        metricPop: {
          "0%": { opacity: "0", transform: "scale(0.5)" },
          "50%": { transform: "scale(1.05)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
      transitionTimingFunction: {
        "bounce-in": "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
        "smooth": "cubic-bezier(0.4, 0, 0.2, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
