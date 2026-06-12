import * as React from "react"
import { MusicIcon } from "lucide-react"

import { cn } from "@/lib/utils"

interface ThumbnailProps extends React.ComponentProps<"div"> {
  src?: string
  alt: string
}

/**
 * 16:9-ish image tile with a graceful fallback. If the network image fails
 * (offline / blocked), an icon placeholder is shown instead so the layout
 * never collapses.
 */
function Thumbnail({ src, alt, className, ...props }: ThumbnailProps) {
  const [failed, setFailed] = React.useState(false)

  return (
    <div
      data-slot="thumbnail"
      className={cn(
        "relative shrink-0 overflow-hidden rounded-md bg-muted",
        className
      )}
      {...props}
    >
      {src && !failed ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          draggable={false}
          onError={() => setFailed(true)}
          className="size-full object-cover"
        />
      ) : (
        <div className="flex size-full items-center justify-center text-muted-foreground">
          <MusicIcon className="size-1/3 min-h-3 min-w-3" />
        </div>
      )}
    </div>
  )
}

export { Thumbnail }
