/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'truenicks-navy': '#1a2744',
        'truenicks-navy-light': '#243360',
        'grade-ap-plus-plus': '#1a7a1a',
        'grade-ap-plus': '#2d8a2d',
        'grade-a': '#4aa04a',
        'grade-b': '#2255aa',
        'grade-c': '#cc7700',
        'grade-d': '#aa4400',
        'grade-f': '#cc2200',
        'grade-nr': '#888888',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
