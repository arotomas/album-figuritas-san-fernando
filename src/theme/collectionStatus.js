import { COLLECTION_STATUS } from '../config/albumCollections'

export const COLLECTION_STATUS_LABELS = {
  [COLLECTION_STATUS.INCOMPLETE]: 'En curso',
  [COLLECTION_STATUS.ADVANCED]: 'Avanzada',
  [COLLECTION_STATUS.ALMOST_COMPLETE]: 'Casi completa',
  [COLLECTION_STATUS.COMPLETED]: 'Completada',
}

export const COLLECTION_STATUS_THEME = {
  [COLLECTION_STATUS.INCOMPLETE]: {
    badge: 'bg-black/[0.04] text-muted',
    header: 'border-black/[0.05] bg-white/70',
    progress: 'bg-progress/70',
    glow: 'none',
    pulse: false,
  },
  [COLLECTION_STATUS.ADVANCED]: {
    badge: 'bg-sky-400/12 text-sky-900/75',
    header: 'border-sky-200/30 bg-white/80 shadow-[0_8px_24px_rgba(56,189,248,0.08)]',
    progress: 'bg-gradient-to-r from-sky-400/80 to-progress/80',
    glow: '0 0 20px rgba(56,189,248,0.12)',
    pulse: false,
  },
  [COLLECTION_STATUS.ALMOST_COMPLETE]: {
    badge: 'bg-amber-400/15 text-amber-900/80',
    header: 'border-amber-200/35 bg-white/85 shadow-[0_10px_28px_rgba(251,191,36,0.12)]',
    progress: 'bg-gradient-to-r from-amber-300 to-progress',
    glow: '0 0 24px rgba(251,191,36,0.14)',
    pulse: true,
  },
  [COLLECTION_STATUS.COMPLETED]: {
    badge: 'bg-progress/15 text-ink ring-1 ring-progress/25',
    header: 'border-progress/25 bg-white/90 shadow-[0_10px_32px_rgba(140,198,63,0.16)]',
    progress: 'bg-progress',
    glow: '0 0 28px rgba(140,198,63,0.18)',
    pulse: false,
  },
}

export function getCollectionStatusTheme(status) {
  return COLLECTION_STATUS_THEME[status] ?? COLLECTION_STATUS_THEME[COLLECTION_STATUS.INCOMPLETE]
}
