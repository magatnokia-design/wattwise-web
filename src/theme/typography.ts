export const typography = {
  h1: {
    fontSize: '32px',
    fontWeight: '700',
    lineHeight: '1.2',
  },
  h2: {
    fontSize: '24px',
    fontWeight: '600',
    lineHeight: '1.3',
  },
  h3: {
    fontSize: '20px',
    fontWeight: '600',
    lineHeight: '1.4',
  },
  h4: {
    fontSize: '16px',
    fontWeight: '600',
    lineHeight: '1.5',
  },
  body: {
    fontSize: '14px',
    fontWeight: '400',
    lineHeight: '1.5',
  },
  small: {
    fontSize: '12px',
    fontWeight: '400',
    lineHeight: '1.4',
  },
} as const;

export type TypographyVariant = keyof typeof typography;