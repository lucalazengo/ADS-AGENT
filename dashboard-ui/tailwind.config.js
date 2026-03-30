/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: { sans: ["Inter", "Segoe UI", "sans-serif"] },
      colors: {
        brand: {
          50:  "#EBF4FF",
          100: "#D6E8FF",
          200: "#B3D4F5",
          300: "#8EC9F7",
          400: "#6BB8F0",
          500: "#4A9EDF",
          600: "#2D7DD2",
          700: "#1A5CA8",
          800: "#1A3A5C",
          900: "#0F2340",
        },
        dark: {
          bg:      "#0F172A",
          card:    "#1E293B",
          sidebar: "#162032",
          border:  "#2D3748",
        },
      },
    },
  },
  plugins: [],
}

