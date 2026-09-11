import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // placeholder — ajustar para a identidade visual do produto
        brand: {
          DEFAULT: "#1C2A5A",
          dark: "#0D1B3D",
          accent: "#A7D668",
        },
      },
    },
  },
  plugins: [],
};

export default config;
