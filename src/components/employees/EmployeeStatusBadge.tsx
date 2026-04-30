import { User } from 'lucide-react'
import { cn } from '@/lib/utils'

export function EmployeeStatusBadge({
  status,
  category,
  className,
}: {
  status: string | null | undefined
  category?: string | null | undefined
  className?: string
}) {
  if (!status) {
    return <span className={cn('text-muted-foreground text-xs', className)}>—</span>
  }
  const isIncluded = status === 'Included'
  const isActive = category === 'Active'
  return (
    <span className={cn('inline-flex items-start gap-2 text-sm', className)}>
      {/* filled circle behind a small user icon. lucide doesn't ship a "filled" CircleUser. */}
      <span
        aria-hidden="true"
        className={cn(
          'mt-0.5 inline-flex size-4 items-center justify-center rounded-full',
          isIncluded ? 'bg-emerald-500' : 'bg-muted-foreground/40',
        )}
      >
        <User className="size-2.5 text-white" strokeWidth={3} />
      </span>
      <span className="flex flex-col leading-tight">
        <span>{status}</span>
        {category && (
          <span className={cn('text-xs', isActive ? 'text-emerald-700' : 'text-muted-foreground')}>
            {category}
          </span>
        )}
      </span>
    </span>
  )
}
