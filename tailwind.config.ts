import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        black: "#0B0B0F",
        richBlack: "#111118",
        gold: "#FF4FA3",
        softGold: "#FF8FC6",
        silver: "#E4D0DD",
        coolSilver: "#C7B8C8",
        textWhite: "#F7F7FB",
        mutedText: "#A9A0B2",
        border: "rgba(255,79,163,0.26)"
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem"
      },
      boxShadow: {
        luxury: "0 10px 40px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 143, 198, 0.1)"
      },
      backgroundImage: {
        glow: "radial-gradient(circle at top, rgba(255,79,163,0.2), transparent 48%), radial-gradient(circle at 80% 40%, rgba(199,184,200,0.16), transparent 36%)"
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
