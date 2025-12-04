/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        gunmetal: '#2b2f33',
        silver: '#c9ced3',
        tactical: '#1f2937',
        accent: '#9aa6b2',
        highlight: '#7da9ff',
      },
      fontFamily: {
        display: ['Orbitron', 'ui-sans-serif', 'system-ui'],
        body: ['Inter', 'ui-sans-serif', 'system-ui'],
      },
    },
  },
  plugins: [],
};
