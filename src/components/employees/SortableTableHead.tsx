import { ArrowDown, ArrowUp } from 'lucide-react'
import type { ReactNode } from 'react'
import { TableHead } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { sortDirectionForField } from './sort'

export type SortableTableHeadProps = {
  field: string
  currentSort: string | null
  onSort: () => void
  className?: string
  children: ReactNode
}

/** TableHead with a sort affordance that cycles unsorted → asc → desc → unsorted. */
export function SortableTableHead({
  field,
  currentSort,
  onSort,
  className,
  children,
}: SortableTableHeadProps) {
  const direction = sortDirectionForField(currentSort, field)
  // unsorted shows a dimmed down-arrow per the Figma; asc flips it to up at full opacity.
  const Icon = direction === 'asc' ? ArrowUp : ArrowDown
  const ariaSort = direction === 'asc' ? 'ascending' : direction === 'desc' ? 'descending' : 'none'

  return (
    <TableHead className={className} aria-sort={ariaSort}>
      <button
        type="button"
        onClick={onSort}
        className="hover:text-foreground inline-flex cursor-pointer items-center gap-1 transition-colors"
      >
        {children}
        <Icon className={cn('size-3', direction === null && 'opacity-40')} />
      </button>
    </TableHead>
  )
}
