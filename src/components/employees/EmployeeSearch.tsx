import { Search, X } from 'lucide-react'
import { parseAsArrayOf, parseAsString, useQueryState } from 'nuqs'
import type { ChangeEvent } from 'react'
import { useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue'
import { emit, events } from '@/lib/telemetry'
import { cn } from '@/lib/utils'

const SEARCH_TELEMETRY_DEBOUNCE_MS = 300

export function EmployeeSearch({ className }: { className?: string }) {
  const [search, setSearch] = useQueryState('q', parseAsString.withOptions({ history: 'replace' }))
  const [, setCursors] = useQueryState('cursor', parseAsArrayOf(parseAsString).withDefault([]))
  const debouncedSearch = useDebouncedValue(search ?? '', SEARCH_TELEMETRY_DEBOUNCE_MS)
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    emit(events.employeesSearchChanged(debouncedSearch.length))
  }, [debouncedSearch])

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    void setSearch(event.target.value || null)
    // search reshapes the result set; the existing cursor trail no longer applies.
    void setCursors([])
  }

  const handleSearchClear = () => {
    void setSearch(null)
    void setCursors([])
  }

  return (
    <div className={cn('relative', className)}>
      <Search
        aria-hidden="true"
        className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
      />
      <Input
        type="search"
        placeholder="Search employees by name ..."
        value={search ?? ''}
        onChange={handleSearchChange}
        aria-label="Search employees by name"
        // hide the WebKit native cancel button — we render our own for cross-browser parity.
        className="pr-9 pl-9 [&::-webkit-search-cancel-button]:hidden"
      />
      {search && (
        <button
          type="button"
          onClick={handleSearchClear}
          aria-label="Clear search"
          className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-sm transition-colors"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  )
}
