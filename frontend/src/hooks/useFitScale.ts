import { useEffect, useRef, useState, type RefObject } from 'react'

/**
 * Measures a container and returns the scale factor that fits a fixed design
 * (designW × designH) inside it without overflowing. Use on a wrapper around the
 * fixed-size artboard: `transform: scale(scale)`.
 */
export function useFitScale(
  designW: number,
  designH: number,
): [RefObject<HTMLDivElement | null>, number] {
  const ref = useRef<HTMLDivElement | null>(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => {
      const { width, height } = el.getBoundingClientRect()
      if (width === 0 || height === 0) return
      setScale(Math.min(width / designW, height / designH))
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [designW, designH])

  return [ref, scale]
}
