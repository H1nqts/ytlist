import * as React from "react"

import { usePlayer } from "@/hooks/use-player"

const SEEK_STEP_SEC = 5
const VOLUME_STEP = 0.05
const SEARCH_INPUT_SELECTOR = '[aria-label="Search tracks"]'
const TEXT_ENTRY_SELECTOR =
  'input, textarea, select, [contenteditable="true"], [data-slot="input"]'
const SLIDER_SELECTOR = '[data-slot="slider"]'
const BUTTON_SELECTOR = 'button, [role="button"]'
const OPEN_DIALOG_SELECTOR = '[role="dialog"]'

function focusSearch() {
  const input = document.querySelector<HTMLInputElement>(SEARCH_INPUT_SELECTOR)
  input?.focus()
  input?.select()
}

export function useKeyboardShortcuts() {
  const player = usePlayer()
  const playerRef = React.useRef(player)
  playerRef.current = player

  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.isComposing || e.keyCode === 229) return
      if (e.altKey || e.metaKey) return

      const target = e.target as HTMLElement | null
      if (target?.closest(TEXT_ENTRY_SELECTOR)) return
      if (target?.closest(SLIDER_SELECTOR)) return
      if (document.querySelector(OPEN_DIALOG_SELECTOR)) return

      const { state, togglePlay, toggleMute, next, prev, seekBy, setVolume } =
        playerRef.current

      const stepVolume = (delta: number) => setVolume(state.volume + delta)

      if (e.ctrlKey) {
        switch (e.key) {
          case "ArrowRight":
            if (e.repeat) return
            e.preventDefault()
            next()
            return
          case "ArrowLeft":
            if (e.repeat) return
            e.preventDefault()
            prev()
            return
          case "f":
          case "F":
            e.preventDefault()
            focusSearch()
            return
          default:
            return
        }
      }

      if (e.shiftKey) return

      switch (e.key) {
        case " ":
          if (e.repeat || target?.closest(BUTTON_SELECTOR)) return
          e.preventDefault()
          togglePlay()
          return
        case "m":
        case "M":
          if (e.repeat) return
          e.preventDefault()
          toggleMute()
          return
        case "ArrowRight":
          e.preventDefault()
          seekBy(SEEK_STEP_SEC)
          return
        case "ArrowLeft":
          e.preventDefault()
          seekBy(-SEEK_STEP_SEC)
          return
        case "ArrowUp":
          e.preventDefault()
          stepVolume(VOLUME_STEP)
          return
        case "ArrowDown":
          e.preventDefault()
          stepVolume(-VOLUME_STEP)
          return
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])
}
