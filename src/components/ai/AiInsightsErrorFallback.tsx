import { AlertCircle } from 'lucide-react'
import type { FallbackProps } from 'react-error-boundary'
import { Button } from '@/components/ui/button'

/**
 * Per-region fallback shown when a render error escapes the InsightsPanel subtree.
 */
export function AiInsightsErrorFallback({ resetErrorBoundary }: FallbackProps) {
  return (
    <section
      role="alert"
      aria-label="AI insights"
      className="border-muted-foreground/30 bg-muted/40 mx-4 flex flex-col gap-3 rounded-md border border-dashed p-4 text-sm"
    >
      <div className="flex items-center gap-2">
        <AlertCircle className="text-destructive size-4 shrink-0" />
        <p className="text-muted-foreground">AI insights encountered an unexpected error.</p>
      </div>
      <Button size="sm" variant="outline" onClick={resetErrorBoundary}>
        Try again
      </Button>
    </section>
  )
}
