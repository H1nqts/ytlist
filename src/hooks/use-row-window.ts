import * as React from "react"

interface RowWindow {
  start: number
  end: number
  offsetTop: number
}

export function useRowWindow(
  viewportRef: React.RefObject<HTMLDivElement | null>,
  count: number,
  pitch: number,
  overscan: number
): RowWindow {
  /** Derived rather than raw scroll metrics: scrolling within one row's pitch
   *  resolves to the same window, and re-rendering then remounts every row. */
  const [window, setWindow] = React.useState({ start: 0, end: 0 })

  const shape = React.useRef({ count, pitch, overscan })
  shape.current = { count, pitch, overscan }

  React.useLayoutEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    const measure = () => {
      const { count, pitch, overscan } = shape.current
      const first = Math.floor(viewport.scrollTop / pitch)
      const visible = Math.ceil(viewport.clientHeight / pitch)
      const start = Math.max(0, first - overscan)
      const end = Math.min(count, first + visible + overscan)
      setWindow((current) =>
        current.start === start && current.end === end ? current : { start, end }
      )
    }

    measure()
    viewport.addEventListener("scroll", measure, { passive: true })
    const observer = new ResizeObserver(measure)
    observer.observe(viewport)
    return () => {
      viewport.removeEventListener("scroll", measure)
      observer.disconnect()
    }
  }, [viewportRef, count, pitch, overscan])

  return {
    start: window.start,
    end: window.end,
    offsetTop: window.start * pitch,
  }
}
