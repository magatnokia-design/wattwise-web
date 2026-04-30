export const spacing = {
  base: 16,
  radius: 12,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export type Spacing = keyof typeof spacing;