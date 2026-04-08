import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        wood: {
          DEFAULT: '#5C3A1E',
          dark: '#3B2010',
          light: '#8B5A2B',
        },
        parchment: {
          DEFAULT: '#F5E6C8',
          dark: '#E8D5A8',
          light: '#FBF4E2',
        },
        candle: {
          DEFAULT: '#F59E0B',
          glow: '#FDE68A',
          dim: '#92400E',
        },
        ember: {
          DEFAULT: '#DC2626',
          dark: '#991B1B',
        },
        ink: {
          DEFAULT: '#1A0F0F',
        },
        moon: {
          DEFAULT: '#1E1B4B',
          mid: '#312E81',
          surface: '#2D2B5F',
        },
        star: {
          DEFAULT: '#E0E7FF',
        },
        sky: {
          DEFAULT: '#BFDBFE',
          mid: '#93C5FD',
          bright: '#EFF6FF',
        },
      },
      fontFamily: {
        tavern: ['"Cinzel"', '"Palatino Linotype"', 'Georgia', 'serif'],
        body: ['"IM Fell English"', 'Georgia', 'serif'],
        mono: ['"Courier Prime"', 'Courier', 'monospace'],
      },
      keyframes: {
        'card-flip': {
          '0%': { transform: 'rotateY(0deg)' },
          '100%': { transform: 'rotateY(180deg)' },
        },
        'candle-flicker': {
          '0%, 100%': { opacity: '1', transform: 'scaleY(1)' },
          '50%': { opacity: '0.85', transform: 'scaleY(0.97)' },
        },
        'zzz-float': {
          '0%': { transform: 'translateY(0) scale(1)', opacity: '0.8' },
          '100%': { transform: 'translateY(-24px) scale(0.5)', opacity: '0' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-ring': {
          '0%': { boxShadow: '0 0 0 0 rgba(245, 158, 11, 0.5)' },
          '70%': { boxShadow: '0 0 0 10px rgba(245, 158, 11, 0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(245, 158, 11, 0)' },
        },
      },
      animation: {
        'card-flip': 'card-flip 0.7s ease-in-out forwards',
        'candle-flicker': 'candle-flicker 2s ease-in-out infinite',
        'zzz-float': 'zzz-float 1.5s ease-in-out infinite',
        'fade-in': 'fade-in 0.3s ease-out',
        'pulse-ring': 'pulse-ring 1.5s ease-out infinite',
      },
    },
  },
  plugins: [],
} satisfies Config
