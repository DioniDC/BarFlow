/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fdf6e7',
          100: '#fbe9bf',
          400: '#e0a83d',
          500: '#c98c1f',
          600: '#a86f12',
          700: '#7a4f0c',
        },
      },
    },
  },
  plugins: [],
};
