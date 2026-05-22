import { useCallback, useMemo, useState } from 'react'
import { album } from '../theme/album'
import { motion as motionTokens } from '../theme/motion'

const { stack } = album.featured
const { swipeThreshold, velocityThreshold, dragElastic } = album.carousel

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

export function useCarouselPhysics({ items, activeId, onChange }) {
  const [dragX, setDragX] = useState(0)

  const activeIndex = useMemo(
    () => Math.max(0, items.findIndex((item) => item.id === activeId)),
    [items, activeId],
  )

  const goToIndex = useCallback(
    (index) => {
      const next = items[index]
      if (next && next.id !== activeId) onChange?.(next.id)
    },
    [items, activeId, onChange],
  )

  const goNext = useCallback(() => {
    if (activeIndex < items.length - 1) goToIndex(activeIndex + 1)
  }, [activeIndex, items.length, goToIndex])

  const goPrev = useCallback(() => {
    if (activeIndex > 0) goToIndex(activeIndex - 1)
  }, [activeIndex, goToIndex])

  const resolveSwipe = useCallback(
    (offsetX, velocityX) => {
      const passedOffset = Math.abs(offsetX) > swipeThreshold
      const passedVelocity = Math.abs(velocityX) > velocityThreshold

      if (!passedOffset && !passedVelocity) return

      if (offsetX > 0 || velocityX > 0) goPrev()
      else goNext()
    },
    [goNext, goPrev],
  )

  const onDrag = useCallback((_, info) => {
    setDragX(info.offset.x)
  }, [])

  const onDragEnd = useCallback(
    (_, info) => {
      resolveSwipe(info.offset.x, info.velocity.x)
      setDragX(0)
    },
    [resolveSwipe],
  )

  const getStackStyle = useCallback(
    (index) => {
      const offset = index - activeIndex
      const dragProgress = clamp(dragX / 280, -1, 1)
      const isActive = offset === 0
      const isVisible = Math.abs(offset) <= 1

      if (!isVisible) {
        return {
          x: offset > 0 ? '120%' : '-120%',
          scale: stack.neighborScale - 0.08,
          opacity: 0,
          zIndex: 0,
          filter: 'blur(4px)',
          rotateY: 0,
          pointerEvents: 'none',
        }
      }

      const baseX = offset * stack.neighborOffset
      const neighborPull = Math.abs(offset) === 1 ? -dragProgress * 18 : 0

      const scale = isActive
        ? 1 - Math.abs(dragProgress) * 0.03
        : stack.neighborScale + Math.abs(dragProgress) * stack.depthScale

      const opacity = isActive
        ? 1
        : stack.neighborOpacity + Math.abs(dragProgress) * 0.12

      const blur = isActive ? 0 : stack.neighborBlur
      const rotateY = isActive ? dragProgress * -6 : offset * 4

      return {
        x: isActive ? 0 : baseX + neighborPull,
        scale,
        opacity,
        zIndex: isActive ? 20 : 10 - Math.abs(offset),
        filter: blur ? `blur(${blur}px)` : 'none',
        rotateY,
        pointerEvents: isActive ? 'auto' : 'none',
        isActive,
      }
    },
    [activeIndex, dragX],
  )

  const dragProps = useMemo(
    () => ({
      drag: 'x',
      dragConstraints: { left: 0, right: 0 },
      dragElastic,
      onDrag,
      onDragEnd,
      style: { touchAction: 'pan-y' },
      transition: motionTokens.spring.soft,
    }),
    [onDrag, onDragEnd],
  )

  return {
    activeIndex,
    dragX,
    dragProps,
    getStackStyle,
    goNext,
    goPrev,
    goToIndex,
    resolveSwipe,
  }
}
