import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        retu: {
          charcoal: '#171717',
          dark: '#0F0F0F',
          pink: '#F22552',
          purple: '#B94E9F',
          grey: '#777777',
          'warm-white': '#F7F5F0',
          mango: '#F4C52B',
          border: '#EAEAEA',
          card: '#FAFAF8',
        },
      },
      fontFamily: {
        sans: ['var(--font-montserrat)', 'Montserrat', 'Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
