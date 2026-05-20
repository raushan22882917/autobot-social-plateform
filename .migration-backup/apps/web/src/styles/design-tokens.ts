/**
 * Synthetic Transcendence Design System
 * High-performance SaaS design tokens for AutoBot360
 */

export const colors = {
  // Surface Colors
  surface: '#15121b',
  surfaceDim: '#15121b',
  surfaceBright: '#3b3742',
  surfaceContainerLowest: '#0f0d15',
  surfaceContainerLow: '#1d1a23',
  surfaceContainer: '#211e27',
  surfaceContainerHigh: '#2c2832',
  surfaceContainerHighest: '#37333d',
  onSurface: '#e7e0ed',
  onSurfaceVariant: '#cbc3d7',
  inverseSurface: '#e7e0ed',
  inverseOnSurface: '#322f39',
  outline: '#958ea0',
  outlineVariant: '#494454',
  surfaceTint: '#d0bcff',

  // Primary Colors
  primary: '#d0bcff',
  onPrimary: '#3c0091',
  primaryContainer: '#a078ff',
  onPrimaryContainer: '#340080',
  inversePrimary: '#6d3bd7',
  primaryFixed: '#e9ddff',
  primaryFixedDim: '#d0bcff',
  onPrimaryFixed: '#23005c',
  onPrimaryFixedVariant: '#5516be',

  // Secondary Colors
  secondary: '#4cd7f6',
  onSecondary: '#003640',
  secondaryContainer: '#03b5d3',
  onSecondaryContainer: '#00424e',
  secondaryFixed: '#acedff',
  secondaryFixedDim: '#4cd7f6',
  onSecondaryFixed: '#001f26',
  onSecondaryFixedVariant: '#004e5c',

  // Tertiary Colors
  tertiary: '#4fdbc8',
  onTertiary: '#003731',
  tertiaryContainer: '#00a392',
  onTertiaryContainer: '#00302a',
  tertiaryFixed: '#71f8e4',
  tertiaryFixedDim: '#4fdbc8',
  onTertiaryFixed: '#00201c',
  onTertiaryFixedVariant: '#005048',

  // Error Colors
  error: '#ffb4ab',
  onError: '#690005',
  errorContainer: '#93000a',
  onErrorContainer: '#ffdad6',

  // Background
  background: '#15121b',
  onBackground: '#e7e0ed',
  surfaceVariant: '#37333d',

  // Gradients
  gradientPrimary: 'linear-gradient(135deg, #d0bcff 0%, #6d3bd7 100%)',
  gradientAccent: 'linear-gradient(135deg, #4cd7f6 0%, #4fdbc8 100%)',
  gradientVioletCyan: 'linear-gradient(135deg, #8B5CF6 0%, #06B6D4 100%)',

  // Glass Effects
  glassLight: 'rgba(255, 255, 255, 0.05)',
  glassBorder: 'rgba(255, 255, 255, 0.1)',
  glassGlow: 'rgba(139, 92, 246, 0.15)',

  // Semantic
  success: '#4fdbc8',
  warning: '#ffb4ab',
  info: '#4cd7f6',
  danger: '#ffb4ab',
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
  glow: '0 0 40px rgba(139, 92, 246, 0.15)',
  glowAccent: '0 0 40px rgba(76, 215, 246, 0.15)',
  glowTertiary: '0 0 40px rgba(79, 219, 200, 0.15)',
  sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px rgba(0, 0, 0, 0.1)',
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
