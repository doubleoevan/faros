import { ArrowDown, ArrowUp } from 'lucide-react'
import type { ReactNode } from 'react'
import { TableHead } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { sortDirectionForField } from './sort'

export type SortableTableHeadProps = {
  field: string
  currentSort: string | null
  onTableSort: () => void
  className?: string
  children: ReactNode
}

/** TableHead with a sort affordance that cycles unsorted → asc → desc → unsorted. */
export function SortableTableHead({
  field,
  currentSort,
  onTableSort,
  className,
  children,
}: SortableTableHeadProps) {
  const direction = sortDirectionForField(currentSort, field)
  // unsorted shows a dimmed down-arrow per the Figma; asc flips it to up at full opacity.
  const Icon = direction === 'asc' ? ArrowUp : ArrowDown
  const ariaSort = direction === 'asc' ? 'ascending' : direction === 'desc' ? 'descending' : 'none'

  return (
    // relative + absolute button so the entire cell area is the click target, not just the
    // text+icon. button covers TableHead's padding too — clicking anywhere in the cell sorts.
    <TableHead className={cn('relative', className)} aria-sort={ariaSort}>
      <button
        type="button"
        onClick={onTableSort}
        className="hover:text-foreground absolute inset-0 flex cursor-pointer items-center gap-1 px-2 text-left transition-colors"
      >
        {children}
        <Icon className={cn('size-3', direction === null ? 'opacity-40' : 'text-sky-600')} />
      </button>
    </TableHead>
  )
}
