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
        // Brand website (retufoods.com pages) palette, matching the original Squarespace site
        brand: {
          pink: '#EE1745',
          purple: '#7B2D8E',
          mango: '#F5A623',
          blush: '#FDEFF2',
          ink: '#000000',
        },
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
        display: ['casablanca-urw', 'var(--font-poppins)', 'sans-serif'],
        button: ['var(--font-poppins)', 'Poppins', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
