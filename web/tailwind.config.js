/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        xh: {
          bg: 'var(--xh-bg)',
          surface: 'var(--xh-surface)',
          primary: 'var(--xh-primary)',
          'primary-soft': 'var(--xh-primary-soft)',
          text: 'var(--xh-text)',
          'text-secondary': 'var(--xh-text-secondary)',
          border: 'var(--xh-border)',
          sidebar: 'var(--xh-sidebar)',
          success: 'var(--xh-success)',
          error: 'var(--xh-error)',
        },
      },
      animation: {
        'shimmer': 'shimmer 2s linear infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'float': 'float 6s ease-in-out infinite',
        'pulse-soft': 'pulse-soft 3s ease-in-out infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        glow: {
          '0%': { opacity: '0.4', transform: 'scale(0.8)' },
          '100%': { opacity: '0.8', transform: 'scale(1.2)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
  corePlugins: {
    preflight: false,
  },
};
