import iconUrl from "@/assets/icon.png"

import { cn } from "@/lib/utils"

function AppIcon({ className, ...props }: React.ComponentProps<"img">) {
  return (
    <img
      data-slot="app-icon"
      src={iconUrl}
      alt=""
      draggable={false}
      className={cn("size-7 rounded-md", className)}
      {...props}
    />
  )
}

export { AppIcon }
