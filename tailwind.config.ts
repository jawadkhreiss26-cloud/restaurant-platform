import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fdf4ee",
          100: "#f8e3d3",
          500: "#c9762b",
          600: "#a85e1f",
          700: "#824a19"
        }
      }
    }
  },
  plugins: []
};

export default config;
