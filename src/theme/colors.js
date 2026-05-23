export const colors = {
  base: {
    black: '#0a0a0b',
    ink: '#111113',
    charcoal: '#1a1a1e',
    slate: '#2a2a30',
    muted: '#8b8b95',
    soft: '#c4c4cc',
    warmWhite: '#faf9f7',
    white: '#ffffff',
  },
  accent: {
    lime: '#8cc63f',
    limeSoft: '#8cc63f',
    limeGlow: 'rgba(140, 198, 63, 0.35)',
  },
  surface: {
    light: '#f5f5f3',
    card: '#faf9f7',
    elevated: '#ffffff',
    dark: '#141416',
  },
  border: {
    light: '#e8e8ea',
    dark: 'rgba(255,255,255,0.08)',
  },
}

export const cssVars = {
  '--color-ink': colors.base.ink,
  '--color-muted': colors.base.muted,
  '--color-surface': colors.surface.light,
  '--color-border': colors.border.light,
  '--color-progress': colors.accent.limeSoft,
  '--color-warm-white': colors.base.warmWhite,
  '--color-charcoal': colors.base.charcoal,
}
