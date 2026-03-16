/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        forest:         '#1a3a2a',
        navy:           '#0f1f3d',
        gold:           '#c9a84c',
        'gold-light':   '#e8c97a',
        'forest-light': '#2a5a42',
        'navy-light':   '#1a3460',
        surface:        '#0d1a2e',
        'surface-2':    '#132038',
        'surface-3':    '#1c2e4a',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-ring': 'pulse-ring 1.5s cubic-bezier(0.215, 0.61, 0.355, 1) infinite',
        'spin-slow':  'spin 3s linear infinite',
        'fade-in':    'fade-in 0.4s ease forwards',
        'slide-up':   'slide-up 0.4s ease forwards',
      },
      keyframes: {
        'pulse-ring': {
          '0%':   { transform: 'scale(0.95)', boxShadow: '0 0 0 0 rgba(201,168,76,0.6)' },
          '70%':  { transform: 'scale(1)',    boxShadow: '0 0 0 20px rgba(201,168,76,0)' },
          '100%': { transform: 'scale(0.95)', boxShadow: '0 0 0 0 rgba(201,168,76,0)'   },
        },
        'fade-in':  { from: { opacity: '0' },                              to: { opacity: '1' } },
        'slide-up': { from: { opacity: '0', transform: 'translateY(16px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
}
