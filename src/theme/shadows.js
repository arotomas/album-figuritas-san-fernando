export const shadows = {
  sm: '0 1px 2px rgba(0,0,0,0.06)',
  md: '0 4px 12px rgba(0,0,0,0.08)',
  lg: '0 8px 24px rgba(0,0,0,0.12)',
  card: '0 12px 40px rgba(0,0,0,0.18)',
  glow: (color) => `0 0 40px ${color}, 0 8px 32px rgba(0,0,0,0.25)`,
}

export const shadowClasses = {
  card: 'shadow-[0_12px_40px_rgba(0,0,0,0.18)]',
  elevated: 'shadow-[0_8px_24px_rgba(0,0,0,0.12)]',
  soft: 'shadow-[0_4px_12px_rgba(0,0,0,0.08)]',
}
