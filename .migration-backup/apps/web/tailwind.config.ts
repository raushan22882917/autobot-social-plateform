import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: 'hsl(var(--card))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        accent: 'hsl(var(--accent))',
        muted: 'hsl(var(--muted))',
        border: 'hsl(var(--border))',
      },
      borderRadius: {
        xl: '0.75rem',
        '2xl': '1rem',
      },
      boxShadow: {
        glow: '0 0 40px rgba(139, 92, 246, 0.15)',
        glass: '0 8px 32px rgba(0, 0, 0, 0.12)',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #8B5CF6 0%, #06B6D4 100%)',
        'gradient-radial': 'radial-gradient(ellipse at top, rgba(139,92,246,0.15), transparent 50%)',
      },
    },
  },
  plugins: [],
};

export default config;
