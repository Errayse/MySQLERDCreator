/** @type {import('tailwindcss').Config} */
export default {
  content: ['index.html', 'src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        glass: {
          bg: 'rgba(15, 23, 42, 0.6)',
          border: 'rgba(148, 163, 184, 0.12)',
          highlight: 'rgba(255, 255, 255, 0.06)',
        },
        accent: {
          cyan: '#22d3ee',
          violet: '#a78bfa',
          emerald: '#34d399',
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        glow: '0 0 40px -10px rgba(34, 211, 238, 0.25)',
      },
      fontFamily: {
        sans: ['JetBrains Mono', 'SF Mono', 'Consolas', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(12px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
}
