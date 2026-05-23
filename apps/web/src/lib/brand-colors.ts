/**
 * Social platform brand colors — single source of truth for the app theme.
 */
export const BRAND = {
  instagram: {
    base: '#E4405F',
    purple: '#833AB4',
    pink: '#E1306C',
    orange: '#F77737',
    gradient: 'linear-gradient(135deg, #833AB4 0%, #E1306C 45%, #F77737 100%)',
    gradientTailwind: 'from-[#833AB4] via-[#E4405F] to-[#F77737]',
  },
  facebook: {
    base: '#1877F2',
    gradientTailwind: 'from-[#1877F2] to-[#0d65d9]',
  },
  whatsapp: {
    base: '#25D366',
    gradientTailwind: 'from-[#25D366] to-[#128C7E]',
  },
  youtube: {
    base: '#FF0000',
    gradientTailwind: 'from-[#FF0000] to-[#CC0000]',
  },
  google: {
    blue: '#4285F4',
    red: '#EA4335',
    yellow: '#FBBC05',
    green: '#34A853',
    gradient: 'linear-gradient(135deg, #4285F4, #EA4335, #FBBC05, #34A853)',
    gradientTailwind: 'from-[#4285F4] via-[#EA4335] to-[#34A853]',
  },
} as const;

export const PLATFORM_GRADIENTS: Record<string, string> = {
  instagram: BRAND.instagram.gradientTailwind,
  facebook: BRAND.facebook.gradientTailwind,
  youtube: BRAND.youtube.gradientTailwind,
  google_business: BRAND.google.gradientTailwind,
  whatsapp: BRAND.whatsapp.gradientTailwind,
};
