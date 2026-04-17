// tailwind.config.js
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./src/**/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#0ea5e9", // teal-500
        neutral: "#64748b", // slate-500
      },
    },
  },
  plugins: [],
};
