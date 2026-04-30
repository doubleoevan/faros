import type { FallbackProps } from 'react-error-boundary'
import { cn } from '@/lib/utils'

export function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div role="alert" className={cn('p-6')}>
      <p className="font-semibold">Something went wrong</p>
      <pre className="text-muted-foreground mt-2 text-sm whitespace-pre-wrap">{error.message}</pre>
      <button type="button" onClick={resetErrorBoundary} className="text-primary mt-4 underline">
        Try again
      </button>
    </div>
  )
}
