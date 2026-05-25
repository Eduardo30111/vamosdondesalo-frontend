import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fdf8f0',
          100: '#f9eddb',
          200: '#f2d7b0',
          300: '#e9ba7c',
          400: '#e09848',
          500: '#d97b1e',
          600: '#c46215',
          700: '#a34a14',
          800: '#843b17',
          900: '#6c3216',
        },
        salo: {
          orange: '#E8720C',
          brown: '#5C3317',
          cream: '#FFF8F0',
          gold: '#D4A853',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
