import { Search, X } from 'lucide-react'
import { parseAsArrayOf, parseAsString, useQueryState } from 'nuqs'
import type { ChangeEvent } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export function EmployeeSearch({ className }: { className?: string }) {
  const [search, setSearch] = useQueryState('q', parseAsString.withOptions({ history: 'replace' }))
  const [, setCursors] = useQueryState('cursor', parseAsArrayOf(parseAsString).withDefault([]))

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    void setSearch(event.target.value || null)
    // search reshapes the result set; the existing cursor trail no longer applies.
    void setCursors([])
  }

  const onClear = () => {
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
        onChange={onChange}
        aria-label="Search employees by name"
        // hide the WebKit native cancel button — we render our own for cross-browser parity.
        className="pr-9 pl-9 [&::-webkit-search-cancel-button]:hidden"
      />
      {search && (
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear search"
          className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-sm transition-colors"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  )
}
