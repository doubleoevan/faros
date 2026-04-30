import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type EmployeePaginationProps = {
  pageStart: number
  pageEnd: number
  totalCount: number
  canGoPrevious: boolean
  canGoNext: boolean
  isLoading?: boolean
  onPreviousPage: () => void
  onNextPage: () => void
  className?: string
}

export function EmployeePagination({
  pageStart,
  pageEnd,
  totalCount,
  canGoPrevious,
  canGoNext,
  isLoading,
  onPreviousPage,
  onNextPage,
  className,
}: EmployeePaginationProps) {
  // empty connection: nothing meaningful to page through
  if (totalCount === 0) {
    return null
  }
  return (
    <nav
      className={cn('flex items-center justify-end gap-3 px-3 py-2', className)}
      aria-label="Employees pagination"
    >
      <span className="text-muted-foreground text-sm" aria-live="polite">
        {pageStart}-{pageEnd} of {totalCount}
      </span>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon-sm"
          onClick={onPreviousPage}
          disabled={!canGoPrevious || isLoading}
          aria-label="Previous page"
        >
          <ChevronLeft />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          onClick={onNextPage}
          disabled={!canGoNext || isLoading}
          aria-label="Next page"
        >
          <ChevronRight />
        </Button>
      </div>
    </nav>
  )
}
