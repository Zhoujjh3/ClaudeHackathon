export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cream: '#FAF8F5',
        warm: {
          50: '#FDFCFB', 100: '#FAF8F5', 200: '#F2EDE8', 300: '#E8E0D8',
          400: '#C4B8AB', 500: '#9C8E7E', 600: '#7A6E62', 700: '#5C524A',
          800: '#3D3632', 900: '#1F1B19',
        },
        sage: {
          50: '#F4F7F4', 100: '#E6EDE6', 200: '#C8D9C8', 300: '#A3BFA3',
          400: '#7BA37B', 500: '#5C8A5C', 600: '#4A7049', 700: '#3D5B3D',
          800: '#334A33', 900: '#2B3D2B',
        },
        terra: {
          400: '#D9956A', 500: '#C47A4A', 600: '#A8613A',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        display: ['Georgia', 'serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.35s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.25s ease-out',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { transform: 'translateY(8px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        slideDown: { '0%': { transform: 'translateY(-6px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
      },
    },
  },
  plugins: [],
}
