import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

export type EmployeePaginationProps = {
  pageStart: number
  pageEnd: number
  totalCount: number
  pageSize: number
  currentPage: number
  canGoPrevious: boolean
  canGoNext: boolean
  isLoading?: boolean
  onPreviousPage: () => void
  onNextPage: () => void
  onSelectPage: (page: number) => void | Promise<void>
  className?: string
}

export function EmployeePagination({
  pageStart,
  pageEnd,
  totalCount,
  pageSize,
  currentPage,
  canGoPrevious,
  canGoNext,
  isLoading,
  onPreviousPage,
  onNextPage,
  onSelectPage,
  className,
}: EmployeePaginationProps) {
  // empty connection: nothing meaningful to page through
  if (totalCount === 0) {
    return null
  }
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  return (
    <nav
      className={cn('flex items-center justify-end gap-3 px-3 py-2', className)}
      aria-label="Employees pagination"
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="gap-1 font-normal"
            aria-label="Jump to page"
          >
            <span aria-live="polite">
              {pageStart}-{pageEnd}
            </span>
            <ChevronDown className="size-3 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[8rem]">
          {/* all pages selectable — back-jumps slice the trail, forward-jumps synthesize one
              from the mock-server's cursor format (see EmployeeTable). */}
          {Array.from({ length: totalPages }).map((_, index) => {
            const page = index + 1
            const start = (page - 1) * pageSize + 1
            const end = Math.min(page * pageSize, totalCount)
            return (
              <DropdownMenuItem key={page} onSelect={() => void onSelectPage(page)}>
                {start}-{end}
                {page === currentPage && (
                  <span className="text-muted-foreground ml-auto text-xs">current</span>
                )}
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>
      <span className="text-muted-foreground text-sm">of {totalCount}</span>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onPreviousPage}
          disabled={!canGoPrevious || isLoading}
          aria-label="Previous page"
        >
          <ChevronLeft />
        </Button>
        <Button
          variant="ghost"
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
