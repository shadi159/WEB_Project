import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--color-primary)',
          dark: '#371f9b',
        },
        secondary:{
          DEFAULT: 'var(--color-secondary)',
          dark: '#371f9b',
        },
        accent: 'var(--color-accent)',
        text: {
          DEFAULT: 'var(--color-text)',
          light: 'var(--color-text-light)',
        },
        background: 'var(--color-background)',
        border: 'var(--color-border)',
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
