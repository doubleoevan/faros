import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type AiConsentPromptProps = {
  isLoading?: boolean
  onConsentGrant: () => Promise<void>
  onConsentDeny: () => void
  className?: string
}

/** Inline panel section that explains AI insights and requests user authorization. */
export function AiConsentPrompt({
  isLoading = false,
  onConsentGrant,
  onConsentDeny,
  className,
}: AiConsentPromptProps) {
  return (
    <section aria-label="AI insights consent" className={cn('flex flex-col gap-4', className)}>
      <div className="flex items-center gap-2">
        <Sparkles className="text-primary size-4 shrink-0" />
        <h3 className="text-sm font-semibold">AI Activity Insights</h3>
      </div>
      <p className="text-muted-foreground text-sm">
        Faros can generate a summary of this employee&apos;s recent activity using data already
        connected to your workspace — commits, pull requests, code reviews, and calendar events.
      </p>
      <ul className="text-muted-foreground space-y-1 text-sm">
        <li>- Git commits and pull requests</li>
        <li>- Code review participation</li>
        <li>- Meeting and calendar activity</li>
      </ul>
      <p className="text-muted-foreground text-xs">
        No personally identifiable information is included. You can change this at any time.
      </p>
      <div className="flex gap-2">
        <Button size="sm" onClick={onConsentGrant} disabled={isLoading}>
          {isLoading ? 'Authorizing…' : 'Allow'}
        </Button>
        <Button size="sm" variant="ghost" onClick={onConsentDeny} disabled={isLoading}>
          No thanks
        </Button>
      </div>
    </section>
  )
}
