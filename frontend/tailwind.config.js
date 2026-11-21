export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        background: '#f8fbfa',
        surface: '#f8fbfa',
        'surface-dim': '#d8dadc',
        'surface-bright': '#ffffff',
        'surface-container': '#edf6f3',
        'surface-container-low': '#f1f8f6',
        'surface-container-lowest': '#ffffff',
        'surface-container-high': '#e5f1ee',
        'surface-container-highest': '#dceae7',
        'surface-variant': '#dceae7',
        'on-surface': '#18312f',
        'on-surface-variant': '#506563',
        primary: '#167c76',
        'primary-container': '#0f625e',
        'primary-fixed': '#b5eee7',
        'primary-fixed-dim': '#83d6cd',
        'on-primary': '#ffffff',
        secondary: '#e38b5b',
        'secondary-container': '#ffe0c9',
        'secondary-fixed': '#ffd1b5',
        tertiary: '#446b91',
        'tertiary-container': '#dceaf8',
        error: '#ba1a1a',
        'error-container': '#ffdad6',
        outline: '#718783',
        'outline-variant': '#bfd2ce',
      },
      boxShadow: {
        soft: '0 14px 34px -14px rgba(22, 124, 118, 0.28)',
        glass: '0 8px 32px 0 rgba(24, 49, 47, 0.08)',
      },
      borderRadius: {
        xl: '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'fade-in-up': 'fadeInUp 0.8s ease-out forwards',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'blob': 'blob 7s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        blob: {
          '0%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
          '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
          '100%': { transform: 'translate(0px, 0px) scale(1)' },
        }
      }
    },
  },
  plugins: [],
}
