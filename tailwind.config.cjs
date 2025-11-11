/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#10b3a6',
          600: '#0ea89c',
          700: '#0c8f85'
        }
      },
      boxShadow: {
        card: '0 0 0 1px rgb(255 255 255 / 0.06), 0 2px 8px rgb(0 0 0 / 0.35)'
      }
    },
  },
  plugins: [],
}

