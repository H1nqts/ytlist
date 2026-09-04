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
  const [range, setRange] = React.useState({ scrollTop: 0, height: 0 })

  React.useLayoutEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    const read = () =>
      setRange({ scrollTop: viewport.scrollTop, height: viewport.clientHeight })

    read()
    viewport.addEventListener("scroll", read, { passive: true })
    const observer = new ResizeObserver(read)
    observer.observe(viewport)
    return () => {
      viewport.removeEventListener("scroll", read)
      observer.disconnect()
    }
  }, [viewportRef])

  const first = Math.floor(range.scrollTop / pitch)
  const visible = Math.ceil(range.height / pitch)
  const start = Math.max(0, first - overscan)

  return {
    start,
    end: Math.min(count, first + visible + overscan),
    offsetTop: start * pitch,
  }
}
