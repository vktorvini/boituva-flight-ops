import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        safe: "#22c55e",
        warning: "#eab308",
        prohibited: "#ef4444",
      },
    },
  },
  plugins: [],
};

export default config;
