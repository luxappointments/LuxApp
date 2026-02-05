import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        black: "#0B0B0F",
        richBlack: "#111118",
        gold: "#D4AF37",
        softGold: "#F5D77A",
        silver: "#C0C0C0",
        coolSilver: "#B8B8C7",
        textWhite: "#F7F7FB",
        mutedText: "#A0A0B2",
        border: "rgba(212,175,55,0.24)"
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem"
      },
      boxShadow: {
        luxury: "0 10px 40px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(245, 215, 122, 0.08)"
      },
      backgroundImage: {
        glow: "radial-gradient(circle at top, rgba(212,175,55,0.2), transparent 48%), radial-gradient(circle at 80% 40%, rgba(184,184,199,0.12), transparent 36%)"
      },
      fontFamily: {
        display: ["'Playfair Display'", "serif"],
        body: ["'Manrope'", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
