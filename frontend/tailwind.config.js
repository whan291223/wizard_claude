/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ['Fredoka', 'system-ui', 'sans-serif'],
        ui: ['Outfit', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Cozy Storybook Wizard palette (class names kept stable; values are warm)
        stage: { 0: '#1c130c', 1: '#34241a' },
        panel: { DEFAULT: '#463324', edge: '#6e4f35', deep: '#41315f' },
        neon: { yellow: '#E8C77A', yellowsoft: '#F3DCA2' },   // warm gold
        glow: { cyan: '#B9A0E8', magenta: '#CF8AB0', purple: '#8B6FC9' }, // amethyst/rose
        paper: '#F3E7CF',
        suit: { red: '#B23A48', dark: '#3A2F28' },
        ink: { DEFAULT: '#F5EAD4', dim: '#C2AA88' },
      },
      zIndex: {
        60: '60',
        70: '70',
        80: '80',
        90: '90',
        200: '200',
      },
    },
  },
  plugins: [],
}
