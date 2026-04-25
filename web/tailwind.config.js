/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        mist: "#f7f4ed",
        ink: "#1d2a36",
        ember: "#c4411f",
        pine: "#2f5d50",
      },
      borderRadius: {
        xxl: "1.25rem",
      },
      boxShadow: {
        panel: "0 14px 40px rgba(29, 42, 54, 0.12)",
      },
    },
  },
  plugins: [],
};
