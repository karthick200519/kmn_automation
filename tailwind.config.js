/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        industrial: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
        },
        healthy: {
          DEFAULT: '#10B981',
          bg: '#ECFDF5',
          text: '#065F46',
          border: '#A7F3D0',
        },
        warning: {
          DEFAULT: '#F59E0B',
          bg: '#FFFBEB',
          text: '#92400E',
          border: '#FDE68A',
        },
        fault: {
          DEFAULT: '#EF4444',
          bg: '#FEF2F2',
          text: '#991B1B',
          border: '#FECACA',
        },
        critical: {
          DEFAULT: '#DC2626',
          bg: '#7F1D1D',
          text: '#FFFFFF',
          border: '#991B1B',
        },
        info: {
          DEFAULT: '#3B82F6',
          bg: '#EFF6FF',
          text: '#1E40AF',
          border: '#BFDBFE',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
