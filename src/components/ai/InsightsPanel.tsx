import { useState, useEffect, useRef } from 'react'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { InsightsErrorType } from '@/lib/ai'
import { useEmployeeInsights } from '@/lib/hooks/useEmployeeInsights'
import { LowConfidenceBadge } from './LowConfidenceBadge'
import { InsightsFeedback } from './InsightsFeedback'
import { InsightsPlaceholder } from './InsightsPlaceholder'
import { PiiNotice } from './PiiNotice'

type InsightsPanelProps = {
  employeeId: string
  onAuthExpired: () => void
}

type RateLimitedCountdownProps = {
  retryAfterSeconds: number
  onRetry: () => void
}

function RateLimitedCountdown({ retryAfterSeconds, onRetry }: RateLimitedCountdownProps) {
  const [secondsRemaining, setSecondsRemaining] = useState(retryAfterSeconds)
  // ref track the retry countdown without resetting on render
  const retryCountdownRef = useRef(onRetry)
  retryCountdownRef.current = onRetry

  useEffect(() => {
    if (secondsRemaining <= 0) {
      retryCountdownRef.current()
      return
    }
    const timer = setTimeout(() => {
      setSecondsRemaining((seconds) => seconds - 1)
    }, 1000)
    return () => clearTimeout(timer)
  }, [secondsRemaining])

  return (
    <p className="text-muted-foreground">Too many requests. Retrying in {secondsRemaining}s…</p>
  )
}

function formatRelativeTime(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime()
  const diffMinutes = Math.floor(diffMs / 60_000)
  if (diffMinutes < 1) {
    return 'just now'
  }
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`
  }
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) {
    return `${diffHours}h ago`
  }
  return new Date(isoString).toLocaleDateString()
}

function errorMessageForType(type: InsightsErrorType): string {
  if (type === 'timeout') {
    return 'Insights timed out.'
  }
  if (type === 'unauthorized') {
    return 'Session expired — re-authorization required.'
  }
  if (type === 'not_found') {
    return 'No AI insights available for this employee.'
  }
  return 'Failed to load insights.'
}

/**
 * AI-generated activity insights panel with PII filtering, confidence badge, and feedback.
 */
export function InsightsPanel({ employeeId, onAuthExpired }: InsightsPanelProps) {
  const { insightsState, handleInsightRetry, handleInsightFeedback } =
    useEmployeeInsights(employeeId)

  if (insightsState.status === 'loading') {
    return <InsightsPlaceholder className="mx-4" />
  }

  if (insightsState.status === 'error') {
    const { type, retryAfterSeconds } = insightsState
    const isRateLimited = type === 'rate_limited'
    const isRetryable =
      type === 'timeout' || type === 'server_error' || type === 'network' || type === 'validation'
    const isAuthExpired = type === 'unauthorized'
    return (
      <section
        aria-label="AI insights"
        className="border-muted-foreground/30 bg-muted/40 mx-4 flex flex-col gap-3 rounded-md border border-dashed p-4 text-sm"
      >
        {isRateLimited ? (
          <RateLimitedCountdown
            retryAfterSeconds={retryAfterSeconds ?? 60}
            onRetry={handleInsightRetry}
          />
        ) : (
          <p className="text-muted-foreground">{errorMessageForType(type)}</p>
        )}
        {isRetryable && (
          <Button size="sm" variant="outline" onClick={handleInsightRetry}>
            Try again
          </Button>
        )}
        {isAuthExpired && (
          <Button size="sm" variant="outline" onClick={onAuthExpired}>
            Re-authorize
          </Button>
        )}
      </section>
    )
  }

  const { insight, summary, hasPii, isLowConfidence } = insightsState
  return (
    <section aria-label="AI insights" className="mx-4 flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-1.5">
          <Sparkles className="text-primary size-3.5 shrink-0" />
          <h3 className="text-sm font-semibold">AI Activity Insights</h3>
        </div>
        <p className="text-muted-foreground text-xs">
          {insight.model} · {formatRelativeTime(insight.generatedAt)}
        </p>
      </div>
      {isLowConfidence && <LowConfidenceBadge confidence={insight.confidence} />}
      {hasPii && <PiiNotice />}
      <p className="text-sm leading-relaxed">{summary}</p>
      <InsightsFeedback key={employeeId} onFeedbackSubmit={handleInsightFeedback} />
    </section>
  )
}
