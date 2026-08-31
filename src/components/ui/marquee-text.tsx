import * as React from "react"

import { cn } from "@/lib/utils"

interface MarqueeTextProps extends React.ComponentProps<"div"> {
  children: string
  as?: "div" | "p" | "h1" | "h2" | "h3" | "span"
  /** Scroll on hover of the enclosing `[data-marquee-group]` instead of self. */
  group?: boolean
  speed?: number
  pause?: number
}

function MarqueeText({
  children,
  as: Component = "div",
  group = false,
  speed = 30,
  pause = 900,
  className,
  ...props
}: MarqueeTextProps) {
  const viewportRef = React.useRef<HTMLDivElement>(null)
  const textRef = React.useRef<HTMLSpanElement>(null)

  const [overflow, setOverflow] = React.useState(0)
  const [active, setActive] = React.useState(false)

  React.useEffect(() => {
    const viewport = viewportRef.current
    const text = textRef.current
    if (!viewport || !text) return

    const measure = () => {
      // Rounded to whole pixels, so ignore sub-pixel differences.
      const diff = text.scrollWidth - viewport.clientWidth
      setOverflow(diff > 1 ? diff : 0)
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(viewport)
    observer.observe(text)
    return () => observer.disconnect()
  }, [children])

  React.useEffect(() => {
    if (!group) return
    const host = viewportRef.current?.closest("[data-marquee-group]")
    if (!host) return

    const enter = () => setActive(true)
    const leave = () => setActive(false)

    host.addEventListener("pointerenter", enter)
    host.addEventListener("pointerleave", leave)
    host.addEventListener("focusin", enter)
    host.addEventListener("focusout", leave)
    return () => {
      host.removeEventListener("pointerenter", enter)
      host.removeEventListener("pointerleave", leave)
      host.removeEventListener("focusin", enter)
      host.removeEventListener("focusout", leave)
    }
  }, [group])

  const self = !group
  const scrolling = active && overflow > 0

  const travel = overflow / speed
  const pauseSec = pause / 1000
  const duration = travel + pauseSec * 2
  const hold = (pauseSec / duration) * 100

  return (
    <Component
      ref={viewportRef}
      onPointerEnter={self ? () => setActive(true) : undefined}
      onPointerLeave={self ? () => setActive(false) : undefined}
      onFocus={self ? () => setActive(true) : undefined}
      onBlur={self ? () => setActive(false) : undefined}
      title={overflow > 0 ? children : undefined}
      className={cn("overflow-hidden", className)}
      {...props}
    >
      <span
        ref={textRef}
        className={cn(
          "block whitespace-nowrap",
          scrolling ? "animate-marquee-text" : "overflow-hidden text-ellipsis"
        )}
        style={
          scrolling
            ? {
                animationDuration: `${duration}s`,
                animationTimingFunction: `linear(0 0%, 0 ${hold}%, 1 ${100 - hold}%, 1 100%)`,
                ["--marquee-distance" as string]: `-${overflow}px`,
              }
            : undefined
        }
      >
        {children}
      </span>
    </Component>
  )
}

export { MarqueeText }
