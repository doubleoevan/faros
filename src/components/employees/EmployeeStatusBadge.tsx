import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export function EmployeeStatusBadge({
  status,
  className,
}: {
  status: string | null | undefined
  className?: string
}) {
  if (!status) {
    return <span className={cn('text-muted-foreground text-xs', className)}>—</span>
  }
  const variant = status === 'Included' ? 'default' : 'secondary'
  return (
    <Badge variant={variant} className={className}>
      {status}
    </Badge>
  )
}
