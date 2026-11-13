/** @type {import('tailwindcss').Config} */
export default {
  // Class strategy keeps the OS dark preference from changing the UI.
  // The app never adds a dark class and does not define a dark theme.
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#6C63FF',
        'primary-dark': '#574FD6',
        secondary: '#38BDF8',
        accent: '#F4A7B9',
        success: '#22C55E',
        ink: '#1E293B',
        muted: '#64748B',
        line: '#E2E8F0',
        canvas: '#F8FAFC',
      },
      fontFamily: {
        sans: ['Manrope', 'ui-sans-serif', 'system-ui'],
        display: ['Fraunces', 'Georgia', 'serif'],
      },
      boxShadow: {
        card: '0 12px 32px rgba(30, 41, 59, 0.06)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.45s cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-in': 'fade-in 0.25s ease-out both',
        'slide-in-right': 'slide-in-right 0.34s cubic-bezier(0.22, 1, 0.36, 1) both',
      },
    },
  },
  plugins: [],
};
