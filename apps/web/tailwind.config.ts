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
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        border: 'hsl(var(--border))',
        destructive: 'hsl(var(--danger))',
        ring: 'hsl(var(--primary))',
        brand: {
          instagram: '#E4405F',
          'instagram-purple': '#833AB4',
          'instagram-pink': '#E1306C',
          'instagram-orange': '#F77737',
          facebook: '#1877F2',
          whatsapp: '#25D366',
          youtube: '#FF0000',
          'google-blue': '#4285F4',
          'google-red': '#EA4335',
          'google-yellow': '#FBBC05',
          'google-green': '#34A853',
        },
      },
      borderRadius: {
        xl: '0.75rem',
        '2xl': '1rem',
      },
      boxShadow: {
        glow: '0 0 40px rgba(228, 64, 95, 0.12)',
        glass: '0 8px 32px rgba(24, 119, 242, 0.08)',
      },
      backgroundImage: {
        'gradient-primary': 'var(--gradient-instagram)',
        'gradient-instagram': 'linear-gradient(135deg, #833AB4 0%, #E1306C 45%, #F77737 100%)',
        'gradient-google': 'linear-gradient(135deg, #4285F4, #EA4335, #FBBC05, #34A853)',
        'gradient-radial': 'radial-gradient(ellipse at top, rgba(131,58,180,0.08), transparent 50%)',
      },
    },
  },
  plugins: [],
};

export default config;
