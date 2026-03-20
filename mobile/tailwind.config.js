/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}", "./index.{js,ts}"],
  theme: {
    extend: {
      colors: {
        primary: "#6C63FF",
        secondary: "#1E1E2E",
        accent: "#FF6B6B",
        surface: "#F8F9FA",
        muted: "#6B7280",
      },
    },
  },
  plugins: [],
};
