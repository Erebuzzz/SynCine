/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0B0F17',
        surface: '#131B2A',
        surfaceHover: '#1B263B',
        accent: '#6366F1',
        accentLight: '#818CF8'
      }
    },
  },
  plugins: [],
}
