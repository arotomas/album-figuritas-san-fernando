import { motion } from './motion'

export const album = {
  featured: {
    aspectRatio: '4/5',
    perspective: 1200,
    parallaxMaxDeg: 5,
    glareOpacity: 0.12,
    stack: {
      neighborScale: 0.86,
      neighborOffset: 72,
      neighborBlur: 2.5,
      neighborOpacity: 0.45,
      depthScale: 0.04,
    },
  },
  carousel: {
    itemWidth: 148,
    gap: 12,
    swipeThreshold: 55,
    velocityThreshold: 280,
    dragElastic: 0.14,
  },
  locked: {
    blurPx: 10,
    silhouetteOpacity: 0.35,
    shimmerDuration: '5s',
  },
  progress: {
    height: 8,
    segmentGap: 4,
    fillDuration: 0.55,
  },
  background: {
    particleIntensity: 0.35,
    glowOpacity: 0.22,
    vignetteStrength: 0.06,
  },
  transition: {
    card: motion.spring.soft,
    fade: { duration: motion.duration.normal, ease: motion.ease.premium },
    description: { duration: 0.28, ease: motion.ease.premium },
  },
}

export const albumClasses = {
  headerEyebrow: 'font-body text-[10px] font-bold uppercase tracking-[0.18em] text-muted',
  featuredTitle: 'font-display text-xl font-bold tracking-tight text-ink',
  featuredDescription: 'font-body text-sm leading-relaxed text-muted',
  hint: 'font-body text-[10px] tracking-wide text-muted/80',
}
