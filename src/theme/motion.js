export const motion = {
  ease: {
    premium: [0.22, 1, 0.36, 1],
    soft: [0.25, 0.46, 0.45, 0.94],
    snap: [0.34, 1.56, 0.64, 1],
    out: [0.16, 1, 0.3, 1],
  },
  duration: {
    fast: 0.2,
    normal: 0.35,
    slow: 0.6,
    reveal: 1.2,
    cardFlip: 1.4,
  },
  spring: {
    soft: { type: 'spring', stiffness: 320, damping: 28 },
    snap: { type: 'spring', stiffness: 420, damping: 24 },
    gentle: { type: 'spring', stiffness: 260, damping: 22 },
  },
  tap: { scale: 0.97 },
  hover: { scale: 1.02 },
}

export const motionClasses = {
  tap: 'active:scale-[0.97] transition-transform duration-150 ease-out',
  lift: 'transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.98]',
}
