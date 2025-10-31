/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          beige: '#FB471F',
          gray: '#3FCCE3',
          teal: '#25384A',
          blue: '#D9DAE4',
          sage: '#757982',
          brown: '#101921',
        },
      },
    },
  },
  plugins: [],
};
