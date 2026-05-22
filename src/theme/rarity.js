import { shadows } from './shadows'

export const RARITY_IDS = ['común', 'rara', 'épica', 'legendaria']

export const RARITIES = {
  común: {
    id: 'común',
    label: 'Común',
    tier: 1,
    colors: {
      primary: '#94a3b8',
      secondary: '#64748b',
      glow: 'rgba(148, 163, 184, 0.35)',
      particle: '#cbd5e1',
      shine: 'rgba(255,255,255,0.15)',
    },
    tailwind: {
      border: 'border-slate-400/80',
      frame: 'border-slate-300/60 bg-slate-50/90',
      glow: 'shadow-[0_0_24px_rgba(148,163,184,0.25)]',
      badge: 'bg-gradient-to-r from-slate-500 to-slate-600',
      accent: 'bg-gradient-to-r from-slate-400 to-slate-500',
      shine: 'via-slate-200/25',
      particle: 'bg-slate-300',
      gradient: 'from-[#2a3038] via-[#1a1e24] to-[#0a0a0b]',
      ring: 'ring-slate-400/40',
      text: 'text-slate-200',
    },
    animation: {
      floatDuration: '3s',
      pulseIntensity: 1.04,
      particleCount: 4,
      particleStyle: 'dust',
    },
    cssGlow: shadows.glow('rgba(148,163,184,0.3)'),
  },
  rara: {
    id: 'rara',
    label: 'Rara',
    tier: 2,
    colors: {
      primary: '#22d3ee',
      secondary: '#0891b2',
      glow: 'rgba(34, 211, 238, 0.4)',
      particle: '#67e8f9',
      shine: 'rgba(186,230,253,0.35)',
    },
    tailwind: {
      border: 'border-cyan-400/70',
      frame: 'border-cyan-300/50 bg-cyan-50/90',
      glow: 'shadow-[0_0_28px_rgba(34,211,238,0.3)]',
      badge: 'bg-gradient-to-r from-cyan-500 to-blue-600',
      accent: 'bg-gradient-to-r from-cyan-400 to-blue-500',
      shine: 'via-cyan-200/35',
      particle: 'bg-cyan-300',
      gradient: 'from-[#0c4a6e] via-[#0e3a5e] to-[#0a0a0b]',
      ring: 'ring-cyan-400/50',
      text: 'text-cyan-100',
    },
    animation: {
      floatDuration: '2.8s',
      pulseIntensity: 1.06,
      particleCount: 6,
      particleStyle: 'spark',
    },
    cssGlow: shadows.glow('rgba(34,211,238,0.35)'),
  },
  épica: {
    id: 'épica',
    label: 'Épica',
    tier: 3,
    colors: {
      primary: '#a78bfa',
      secondary: '#7c3aed',
      glow: 'rgba(167, 139, 250, 0.45)',
      particle: '#c4b5fd',
      shine: 'rgba(221,214,254,0.4)',
    },
    tailwind: {
      border: 'border-violet-400/80',
      frame: 'border-violet-300/50 bg-violet-50/90',
      glow: 'shadow-[0_0_32px_rgba(167,139,250,0.35)]',
      badge: 'bg-gradient-to-r from-violet-500 to-purple-700',
      accent: 'bg-gradient-to-r from-violet-400 to-purple-600',
      shine: 'via-violet-200/40',
      particle: 'bg-violet-300',
      gradient: 'from-[#4c1d95] via-[#2e1065] to-[#0a0a0b]',
      ring: 'ring-violet-400/55',
      text: 'text-violet-100',
    },
    animation: {
      floatDuration: '2.6s',
      pulseIntensity: 1.08,
      particleCount: 8,
      particleStyle: 'spark',
    },
    cssGlow: shadows.glow('rgba(167,139,250,0.4)'),
  },
  legendaria: {
    id: 'legendaria',
    label: 'Legendaria',
    tier: 4,
    colors: {
      primary: '#fbbf24',
      secondary: '#d97706',
      glow: 'rgba(251, 191, 36, 0.5)',
      particle: '#fde68a',
      shine: 'rgba(254,243,199,0.55)',
    },
    tailwind: {
      border: 'border-amber-400/90',
      frame: 'border-amber-300/60 bg-amber-50/90',
      glow: 'shadow-[0_0_40px_rgba(251,191,36,0.45),0_0_80px_rgba(251,191,36,0.15)]',
      badge: 'bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600',
      accent: 'bg-gradient-to-r from-amber-400 to-orange-500',
      shine: 'via-amber-100/50',
      particle: 'bg-amber-200',
      gradient: 'from-[#78350f] via-[#451a03] to-[#0a0a0b]',
      ring: 'ring-amber-400/60',
      text: 'text-amber-50',
    },
    animation: {
      floatDuration: '2.4s',
      pulseIntensity: 1.12,
      particleCount: 12,
      particleStyle: 'legendary',
    },
    cssGlow: shadows.glow('rgba(251,191,36,0.5)'),
  },
}

/** @deprecated usar getRarity() — mantiene compatibilidad */
export const RARITY_STYLES = Object.fromEntries(
  Object.entries(RARITIES).map(([key, rarity]) => [key, rarity.tailwind]),
)

export function getRarity(rareza) {
  return RARITIES[rareza] ?? RARITIES['común']
}
