import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#111827',
      },
      keyframes: {
        'fade-up': {
          '0%': {
            opacity: '0',
            transform: 'translate(-50%, 10px)'
          },
          '100%': {
            opacity: '1',
            transform: 'translate(-50%, 0)'
          }
        },
        'fade-out': {
          '0%': {
            opacity: '1',
            transform: 'translate(-50%, 0)'
          },
          '100%': {
            opacity: '0',
            transform: 'translate(-50%, -10px)'
          }
        }
      },
      animation: {
        'fade-up': 'fade-up 0.2s ease-out',
        'fade-out': 'fade-out 0.2s ease-out'
      }
    },
  },
  plugins: [],
};
export default config;