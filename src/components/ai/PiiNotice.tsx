import { ShieldAlert } from 'lucide-react'
import { cn } from '@/lib/utils'

type PiiNoticeProps = {
  className?: string
}

/** Informational banner shown when PII was detected and redacted from the AI summary. */
export function PiiNotice({ className }: PiiNoticeProps) {
  return (
    <div
      className={cn(
        'text-muted-foreground bg-muted/50 flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs',
        className,
      )}
    >
      <ShieldAlert className="size-3.5 shrink-0" />
      <span>Some content was filtered for privacy.</span>
    </div>
  )
}
