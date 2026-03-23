import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: '#04070d',
        panel: '#08111f',
        panelSoft: '#0d1a2b',
        borderSoft: '#1c2a3f',
        accent: '#22c55e',
        accentSoft: '#16a34a',
        success: '#22c55e',
        danger: '#ef4444',
      },
      boxShadow: {
        card: '0 14px 40px rgba(0, 0, 0, 0.45)',
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
