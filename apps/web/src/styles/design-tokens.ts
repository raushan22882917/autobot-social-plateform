/**
 * Social platform brand design tokens for AutoBot360
 */

export const colors = {
  // Canvas
  background: '#ffffff',
  onBackground: '#1a2b42',

  // Surfaces (light)
  surface: '#ffffff',
  surfaceDim: '#f8f9fc',
  surfaceBright: '#eef3fb',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f8f9fc',
  surfaceContainer: '#f8f9fc',
  surfaceContainerHigh: '#eef3fb',
  surfaceContainerHighest: '#e8eef8',
  onSurface: '#1a2b42',
  onSurfaceVariant: '#5a6b82',
  outline: '#1877F2',
  outlineVariant: 'rgba(24, 119, 242, 0.2)',

  // Primary — Instagram
  primary: '#E4405F',
  onPrimary: '#ffffff',
  primaryContainer: '#fce4ec',
  onPrimaryContainer: '#833AB4',

  // Secondary — Facebook
  secondary: '#1877F2',
  onSecondary: '#ffffff',
  secondaryContainer: '#e8f1fe',
  onSecondaryContainer: '#0d65d9',

  // Tertiary — WhatsApp
  tertiary: '#25D366',
  onTertiary: '#ffffff',
  tertiaryContainer: '#e6f9ee',
  onTertiaryContainer: '#128C7E',

  // Error — YouTube red
  error: '#FF0000',
  onError: '#ffffff',
  errorContainer: '#ffe5e5',
  onErrorContainer: '#CC0000',

  // Platform brands
  instagram: '#E4405F',
  instagramPurple: '#833AB4',
  instagramPink: '#E1306C',
  instagramOrange: '#F77737',
  facebook: '#1877F2',
  whatsapp: '#25D366',
  youtube: '#FF0000',
  googleBlue: '#4285F4',
  googleRed: '#EA4335',
  googleYellow: '#FBBC05',
  googleGreen: '#34A853',

  // Gradients
  gradientPrimary: 'linear-gradient(135deg, #833AB4 0%, #E1306C 45%, #F77737 100%)',
  gradientInstagram: 'linear-gradient(135deg, #833AB4 0%, #E1306C 45%, #F77737 100%)',
  gradientGoogle: 'linear-gradient(135deg, #4285F4, #EA4335, #FBBC05, #34A853)',
  gradientFacebook: 'linear-gradient(135deg, #1877F2 0%, #0d65d9 100%)',
  gradientWhatsApp: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',

  // Glass (light)
  glassLight: 'rgba(255, 255, 255, 0.9)',
  glassBorder: 'rgba(24, 119, 242, 0.12)',
  glassGlow: 'rgba(228, 64, 95, 0.12)',

  // Semantic
  success: '#25D366',
  warning: '#FBBC05',
  info: '#1877F2',
  danger: '#FF0000',
};

export const typography = {
  displayLg: {
    fontFamily: 'Inter',
    fontSize: '48px',
    fontWeight: '700',
    lineHeight: '56px',
    letterSpacing: '-0.02em',
  },
  headlineLg: {
    fontFamily: 'Inter',
    fontSize: '32px',
    fontWeight: '600',
    lineHeight: '40px',
    letterSpacing: '-0.01em',
  },
  headlineLgMobile: {
    fontFamily: 'Inter',
    fontSize: '24px',
    fontWeight: '600',
    lineHeight: '32px',
  },
  bodyMd: {
    fontFamily: 'Inter',
    fontSize: '16px',
    fontWeight: '400',
    lineHeight: '24px',
  },
  bodySm: {
    fontFamily: 'Inter',
    fontSize: '14px',
    fontWeight: '400',
    lineHeight: '20px',
  },
  codeMd: {
    fontFamily: 'JetBrains Mono',
    fontSize: '14px',
    fontWeight: '500',
    lineHeight: '20px',
  },
  metricLg: {
    fontFamily: 'JetBrains Mono',
    fontSize: '24px',
    fontWeight: '600',
    lineHeight: '32px',
    letterSpacing: '-0.02em',
  },
  labelCaps: {
    fontFamily: 'Inter',
    fontSize: '12px',
    fontWeight: '700',
    lineHeight: '16px',
    letterSpacing: '0.05em',
  },
};

export const rounded = {
  sm: '0.25rem',
  DEFAULT: '0.5rem',
  md: '0.75rem',
  lg: '1rem',
  xl: '1.5rem',
  full: '9999px',
};

export const spacing = {
  unit: '4px',
  containerMax: '1440px',
  gutter: '24px',
  marginMobile: '16px',
  marginDesktop: '40px',
  stackXs: '8px',
  stackMd: '16px',
  stackLg: '32px',
};

export const shadows = {
  glow: '0 0 40px rgba(228, 64, 95, 0.12)',
  glowAccent: '0 0 40px rgba(24, 119, 242, 0.12)',
  glowTertiary: '0 0 40px rgba(37, 211, 102, 0.12)',
  sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px rgba(24, 119, 242, 0.08)',
  lg: '0 10px 15px rgba(24, 119, 242, 0.1)',
  xl: '0 20px 25px rgba(24, 119, 242, 0.12)',
};

export const transitions = {
  fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
  base: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
  slow: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
};

export const breakpoints = {
  mobile: '640px',
  tablet: '1024px',
  desktop: '1440px',
};

export const grid = {
  mobile: {
    columns: 4,
    gutter: '16px',
    margin: '16px',
  },
  tablet: {
    columns: 8,
    gutter: '16px',
    margin: '24px',
  },
  desktop: {
    columns: 12,
    gutter: '24px',
    margin: '40px',
  },
};
