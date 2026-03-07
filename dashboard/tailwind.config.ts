import type { Config } from 'tailwindcss';

export default {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#2563EB', light: '#3B82F6', dark: '#1D4ED8' },
        secondary: { DEFAULT: '#059669', light: '#10B981' },
        background: { DEFAULT: 'var(--background)', alt: 'var(--background-alt)' },
        card: 'var(--card)',
        foreground: 'var(--foreground)',
        border: 'var(--border)',
        success: '#059669',
        warning: '#D97706',
        error: '#DC2626',
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
