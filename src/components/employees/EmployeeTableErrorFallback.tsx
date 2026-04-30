import { AlertCircle } from 'lucide-react'
import type { FallbackProps } from 'react-error-boundary'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/** Per-region fallback shown when a render error escapes the EmployeeTable subtree. */
export function EmployeeTableErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  const message = error instanceof Error ? error.message : String(error)
  return (
    <div
      role="alert"
      className={cn(
        'border-destructive/40 bg-destructive/5 flex flex-col items-start gap-3 rounded-md border p-6',
      )}
    >
      <div className="flex items-center gap-2">
        <AlertCircle className="text-destructive size-4" />
        <p className="text-destructive font-semibold">Couldn't load the employees table.</p>
      </div>
      <pre className="text-muted-foreground text-sm whitespace-pre-wrap">{message}</pre>
      <Button variant="outline" size="sm" onClick={resetErrorBoundary}>
        Try again
      </Button>
    </div>
  )
}
