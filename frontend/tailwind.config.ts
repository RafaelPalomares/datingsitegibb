import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#071A2D",
        mist: "#F3F7FB",
        ocean: "#0B5B7A",
        coral: "#E56A54",
        sun: "#FFCB6B"
      },
      boxShadow: {
        card: "0 16px 45px -22px rgba(7, 26, 45, 0.45)"
      }
    }
  },
  plugins: []
};

export default config;
