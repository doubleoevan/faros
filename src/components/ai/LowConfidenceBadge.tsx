import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

type LowConfidenceBadgeProps = {
  confidence: number
  className?: string
}

/**
 * Warning badge shown when AI confidence is at or below the low-confidence threshold.
 */
export function LowConfidenceBadge({ confidence, className }: LowConfidenceBadgeProps) {
  const percentage = Math.round(confidence * 100)
  return (
    <div
      className={cn(
        'flex items-start gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400',
        className,
      )}
    >
      <AlertTriangle className="mt-px size-3.5 shrink-0" />
      <span>
        <strong>Low confidence ({percentage}%)</strong> — treat this summary as a starting point,
        not a conclusion.
      </span>
    </div>
  )
}
