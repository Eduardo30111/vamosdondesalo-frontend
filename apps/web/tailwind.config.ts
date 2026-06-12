import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fff5f4',
          100: '#ffe5e2',
          200: '#ffcfca',
          300: '#ffa9a0',
          400: '#ff8677',
          500: '#F58273',
          600: '#e26a5b',
          700: '#bd5144',
          800: '#9c3c31',
          900: '#813227',
        },
        salo: {
          orange: '#F58273',
          brown: '#5C3317',
          cream: '#FFF5F4',
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
