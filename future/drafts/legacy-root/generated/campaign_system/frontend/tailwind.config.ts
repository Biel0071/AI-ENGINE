import type { Config } from 'tailwindcss';

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ink: "#090f19",
        panel: "#121a28",
        panelSoft: "#1a2438",
        cyan: "#22d3ee",
        lime: "#a3e635",
        roseSoft: "#fb7185",
      },
      fontFamily: {
        sans: ["Sora", "Manrope", "ui-sans-serif", "system-ui"],
      },
      boxShadow: {
        panel: "0 20px 45px rgba(8, 18, 33, 0.4)",
      },
    },
  },
} satisfies Config;