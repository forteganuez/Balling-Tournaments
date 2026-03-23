/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}", "./index.{js,ts}"],
  theme: {
    extend: {
      colors: {
        primary: "#6C63FF",
        "primary-dark": "#8B83FF",
        secondary: "#1E1E2E",
        "secondary-dark": "#F8F9FA",
        accent: "#FF6B6B",
        "accent-dark": "#FF8A8A",
        surface: "#F8F9FA",
        "surface-dark": "#1E1E2E",
        background: "#FFFFFF",
        "background-dark": "#121212",
        "card-dark": "#1E1E2E",
        muted: "#6B7280",
        "muted-dark": "#9CA3AF",
        border: "#E5E7EB",
        "border-dark": "#374151",
      },
    },
  },
  plugins: [],
};
