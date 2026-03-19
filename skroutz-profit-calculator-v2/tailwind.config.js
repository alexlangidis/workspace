/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,js}", "./index.html", "./skroutz-fees.html"],
  theme: {
    screens: {
      sm: "640px",
      md: "768px",
      lg: "900px",
      xl: "1280px",
      "2xl": "1536px",
    },
    extend: {},
  },
  plugins: [],
};
