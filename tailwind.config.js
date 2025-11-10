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
        coral: {
          DEFAULT: '#FF8B6A',
          light: '#FFB299',
          dark: '#FF6B47',
        },
        charcoal: {
          DEFAULT: '#2D2D2D',
          light: '#4A4A4A',
        }
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        flyIn: {
          'from': {
            opacity: '0',
            transform: 'translate(-100px, 100px) scale(0.5)',
          },
          'to': {
            opacity: '1',
            transform: 'translate(0, 0) scale(1)',
          },
        },
        flyOut: {
          'from': {
            opacity: '1',
            transform: 'translate(0, 0) scale(1)',
          },
          'to': {
            opacity: '0',
            transform: 'translate(-100px, 100px) scale(0.5)',
          },
        },
      },
      animation: {
        flyIn: 'flyIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        flyOut: 'flyOut 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
      },
    },
  },
  plugins: [],
}
