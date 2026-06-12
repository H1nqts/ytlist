import * as React from "react"

import { LibraryContext } from "@/state/library-context"

export function useLibrary() {
  const ctx = React.useContext(LibraryContext)
  if (!ctx) {
    throw new Error("useLibrary must be used within a LibraryProvider")
  }
  return ctx
}
