import { useState } from 'react'
import { ThumbsDown, ThumbsUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type InsightsFeedbackProps = {
  onFeedbackSubmit: (rating: 'up' | 'down') => void
  className?: string
}

/** Thumbs up / down feedback row for AI-generated insights. */
export function InsightsFeedback({ onFeedbackSubmit, className }: InsightsFeedbackProps) {
  const [submitted, setSubmitted] = useState<'up' | 'down' | null>(null)

  function handleFeedback(rating: 'up' | 'down'): void {
    setSubmitted(rating)
    onFeedbackSubmit(rating)
  }

  if (submitted !== null) {
    return (
      <p className={cn('text-muted-foreground text-xs', className)}>Thanks for your feedback.</p>
    )
  }

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <span className="text-muted-foreground text-xs">Helpful?</span>
      <Button
        variant="ghost"
        size="icon"
        className="size-7"
        aria-label="Helpful"
        onClick={() => handleFeedback('up')}
      >
        <ThumbsUp className="size-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-7"
        aria-label="Not helpful"
        onClick={() => handleFeedback('down')}
      >
        <ThumbsDown className="size-3.5" />
      </Button>
    </div>
  )
}
