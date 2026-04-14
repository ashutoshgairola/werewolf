// frontend/tailwind.config.ts
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
        theme: {
          accent: 'var(--theme-accent)',
          border: 'var(--theme-border)',
          glow: 'var(--theme-glow)',
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
        'atmosphere-fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'glow-pulse': {
          '0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
          '50%': { opacity: '0.7', transform: 'scale(1.05)' },
        },
        'particle-float': {
          '0%': { transform: 'translateY(0px)', opacity: '0.7' },
          '50%': { opacity: '1' },
          '100%': { transform: 'translateY(-40px)', opacity: '0' },
        },
        'particle-twinkle': {
          '0%, 100%': { opacity: '0.2', transform: 'scale(0.8)' },
          '50%': { opacity: '1', transform: 'scale(1.2)' },
        },
        'flavour-slide-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'card-flip': 'card-flip 0.7s ease-in-out forwards',
        'candle-flicker': 'candle-flicker 2s ease-in-out infinite',
        'zzz-float': 'zzz-float 1.5s ease-in-out infinite',
        'fade-in': 'fade-in 0.3s ease-out',
        'pulse-ring': 'pulse-ring 1.5s ease-out infinite',
        'atmosphere-fade-in': 'atmosphere-fade-in 1.2s ease-out forwards',
        'glow-pulse': 'glow-pulse 4s ease-in-out infinite',
        'particle-float': 'particle-float 4s ease-in-out infinite',
        'particle-twinkle': 'particle-twinkle 3s ease-in-out infinite',
        'flavour-slide-up': 'flavour-slide-up 0.6s ease-out forwards',
      },
    },
  },
  plugins: [],
} satisfies Config
