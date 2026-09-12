/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0A0A12',
        bgElevated: '#111120',
        card: '#15152A',
        cardHover: '#1B1B33',
        border: '#26264A',
        text: '#EDEDF7',
        muted: '#8E8EB0',
        muted2: '#63637F',
        accent: '#8B6CFF',
        accent2: '#5CE1C6',
        good: '#4ADE9A',
        warn: '#F5B84F',
        bad: '#FF6B7A',
      },
      borderRadius: {
        xl2: '16px',
      },
    },
  },
  plugins: [],
};
