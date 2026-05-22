export const typography = {
  fontDisplay: '"Outfit", ui-sans-serif, system-ui, sans-serif',
  fontBody: '"DM Sans", ui-sans-serif, system-ui, sans-serif',
  weight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    black: 800,
  },
  tracking: {
    tight: '-0.02em',
    normal: '0',
    wide: '0.06em',
    wider: '0.12em',
    widest: '0.2em',
  },
  scale: {
    caption: '0.6875rem',
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    display: '2rem',
  },
}

export const typeClasses = {
  display: 'font-display font-bold tracking-tight',
  headline: 'font-display font-semibold tracking-tight',
  body: 'font-body font-normal leading-relaxed',
  label: 'font-body text-xs font-semibold uppercase tracking-wider',
  micro: 'font-body text-[10px] font-bold uppercase tracking-widest',
}
