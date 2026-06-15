// tailwind.config.js
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./src/**/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: "var(--app-bg)",
          card: "var(--app-card-bg)",
          cardHover: "var(--app-card-hover)",
          primary: "var(--brand-primary)",
          primaryHover: "var(--brand-primary-hover)",
          primaryLight: "var(--brand-primary-light)",
          primaryBorder: "var(--brand-primary-border)",
          border: "var(--border-color)",
          borderHover: "var(--border-hover)",
          darkBg: "var(--dark-bg)",
          darkCard: "var(--dark-card)",
          darkBorder: "var(--dark-border)",
        },
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          muted: "var(--text-muted)",
          dark: "var(--dark-text)",
          darkMuted: "var(--dark-text-muted)",
        },
      },
      boxShadow: {
        premium: "var(--shadow-premium)",
        premiumMd: "var(--shadow-md)",
        premiumLg: "var(--shadow-lg)",
      },
    },
  },
  plugins: [],
};
