import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

interface EmptyStateProps extends React.ComponentProps<"div"> {
  icon?: LucideIcon
  title: string
  description?: string
  /** Optional action element (e.g. a Button or retry control). */
  action?: React.ReactNode
}

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        "flex h-full w-full flex-col items-center justify-center gap-3 px-6 py-10 text-center",
        className
      )}
      {...props}
    >
      {Icon && (
        <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icon className="size-6" />
        </div>
      )}
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description && (
          <p className="max-w-xs text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}

export { EmptyState }
