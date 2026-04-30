import { cn } from "@/lib/utils"

/**
 * Pulsing placeholder block for loading states. From shadcn/ui.
 */
export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-accent", className)}
      {...props}
    />
  )
}
