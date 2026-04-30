import { Sparkles } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

type InsightsPlaceholderProps = {
  className?: string
}

/** Loading skeleton displayed while AI insights are being fetched. */
export function InsightsPlaceholder({ className }: InsightsPlaceholderProps) {
  return (
    <section
      aria-label="AI insights"
      aria-busy="true"
      className={cn('flex flex-col gap-4', className)}
    >
      <div className="flex items-center gap-1.5">
        <Sparkles className="text-primary size-3.5 shrink-0" />
        <h3 className="text-sm font-semibold">AI Activity Insights</h3>
      </div>
      <Skeleton className="h-3 w-40" />
      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
        <Skeleton className="h-3 w-3/4" />
      </div>
    </section>
  )
}
