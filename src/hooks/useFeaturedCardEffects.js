import { useCallback, useMemo, useRef, useState } from 'react'
import { rafThrottle } from '../utils/performance'
import { album } from '../theme/album'

const { parallaxMaxDeg, glareOpacity } = album.featured

export function useFeaturedCardEffects({ enabled = true } = {}) {
  const cardRef = useRef(null)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const [glare, setGlare] = useState({ x: 50, y: 30 })

  const applyTilt = useCallback(
    (clientX, clientY) => {
      if (!enabled || !cardRef.current) return

      const rect = cardRef.current.getBoundingClientRect()
      const px = (clientX - rect.left) / rect.width
      const py = (clientY - rect.top) / rect.height

      setTilt({
        x: (py - 0.5) * -parallaxMaxDeg * 2,
        y: (px - 0.5) * parallaxMaxDeg * 2,
      })
      setGlare({ x: px * 100, y: py * 100 })
    },
    [enabled],
  )

  const resetTilt = useCallback(() => {
    setTilt({ x: 0, y: 0 })
    setGlare({ x: 50, y: 30 })
  }, [])

  const onPointerMove = useMemo(
    () =>
      rafThrottle((event) => {
        applyTilt(event.clientX, event.clientY)
      }),
    [applyTilt],
  )

  const onPointerLeave = useCallback(() => {
    resetTilt()
  }, [resetTilt])

  const cardMotionStyle = useMemo(
    () => ({
      rotateX: tilt.x,
      rotateY: tilt.y,
      transformStyle: 'preserve-3d',
    }),
    [tilt],
  )

  const glareStyle = useMemo(
    () => ({
      background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,${glareOpacity}), transparent 55%)`,
    }),
    [glare],
  )

  return {
    cardRef,
    cardMotionStyle,
    glareStyle,
    onPointerMove,
    onPointerLeave,
    resetTilt,
    applyTiltFromDrag: (dragX) => {
      if (!enabled) return
      setTilt({ x: 0, y: clamp(dragX / 40, -parallaxMaxDeg, parallaxMaxDeg) })
    },
  }
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}
