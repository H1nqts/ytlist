import * as React from "react"

import { logError } from "@/lib/logger"

interface StatsQueryResult<T> {
  data: T | null
  loading: boolean
  failed: boolean
}

/**
 * Runs `run` whenever `deps` change, dropping responses that arrive after the
 * inputs moved on.
 */
export function useStatsQuery<T>(
  run: () => Promise<T>,
  deps: React.DependencyList,
  label: string
): StatsQueryResult<T> {
  const [data, setData] = React.useState<T | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [failed, setFailed] = React.useState(false)

  // `run` is rebuilt every render, so the caller's deps drive the refetch.
  const latestRun = React.useRef(run)
  latestRun.current = run

  React.useEffect(() => {
    let cancelled = false
    setLoading(true)

    latestRun
      .current()
      .then((value) => {
        if (cancelled) return
        setData(value)
        setFailed(false)
      })
      .catch((err) => {
        if (cancelled) return
        setFailed(true)
        logError(label, err)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, deps)

  return { data, loading, failed }
}
