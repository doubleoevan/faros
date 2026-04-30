import { ChevronDown, X } from 'lucide-react'
import { parseAsArrayOf, parseAsString, useQueryState } from 'nuqs'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useFilterOptions } from '@/lib/hooks/useFilterOptions'
import { cn } from '@/lib/utils'

const cursorStateOptions = parseAsArrayOf(parseAsString).withDefault([])

export function EmployeeFilters({ className }: { className?: string }) {
  const { data } = useFilterOptions()
  const [teams, setTeams] = useQueryState('team', cursorStateOptions)
  const [statuses, setStatuses] = useQueryState('status', cursorStateOptions)
  const [accountTypes, setAccountTypes] = useQueryState('account', cursorStateOptions)
  const [, setCursors] = useQueryState('cursor', cursorStateOptions)

  const teamOptions = data?.filterOptions.teams ?? []
  const statusOptions = data?.filterOptions.trackingStatuses ?? []
  const accountTypeOptions = data?.filterOptions.accountTypes ?? []
  const hasActiveFilter = teams.length + statuses.length + accountTypes.length > 0

  const handleFilterChange = async (
    setFilters: (value: string[]) => Promise<URLSearchParams>,
    filters: string[],
    filterValue: string,
    isFiltered: boolean,
  ) => {
    const updatedFilters = isFiltered
      ? [...filters, filterValue]
      : filters.filter((entry) => entry !== filterValue)
    await setFilters(updatedFilters)
    // any filter change reshapes the result set; the existing cursor trail no longer applies.
    await setCursors([])
  }

  const handleFilterReset = async () => {
    await Promise.all([setTeams([]), setStatuses([]), setAccountTypes([]), setCursors([])])
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <FilterDropdown
        label="Team"
        selectedCount={teams.length}
        options={teamOptions.map((team) => ({ value: team.uid, label: team.name }))}
        selectedValues={teams}
        onFilterChange={(filterValue, isFiltered) =>
          handleFilterChange(setTeams, teams, filterValue, isFiltered)
        }
      />
      <FilterDropdown
        label="Status"
        selectedCount={statuses.length}
        options={statusOptions.map((status) => ({ value: status, label: status }))}
        selectedValues={statuses}
        onFilterChange={(filterValue, isFiltered) =>
          handleFilterChange(setStatuses, statuses, filterValue, isFiltered)
        }
      />
      <FilterDropdown
        label="Accounts"
        selectedCount={accountTypes.length}
        options={accountTypeOptions.map((account) => ({
          value: account.type,
          label: account.source,
        }))}
        selectedValues={accountTypes}
        onFilterChange={(filterValue, isFiltered) =>
          handleFilterChange(setAccountTypes, accountTypes, filterValue, isFiltered)
        }
      />
      {hasActiveFilter && (
        <Button variant="ghost" size="sm" onClick={handleFilterReset} aria-label="Reset filters">
          <X className="size-4" />
          Reset
        </Button>
      )}
    </div>
  )
}

type FilterDropdownProps = {
  label: string
  selectedCount: number
  options: ReadonlyArray<{ value: string; label: string }>
  selectedValues: ReadonlyArray<string>
  onFilterChange: (filterValue: string, isFiltered: boolean) => void | Promise<void>
}

function FilterDropdown({
  label,
  selectedCount,
  options,
  selectedValues,
  onFilterChange,
}: FilterDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={options.length === 0}>
          {label}
          {selectedCount > 0 && (
            <span className="bg-primary text-primary-foreground rounded-full px-1.5 text-xs">
              {selectedCount}
            </span>
          )}
          <ChevronDown className="size-4 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[10rem]">
        {options.map((option) => (
          <DropdownMenuCheckboxItem
            key={option.value}
            checked={selectedValues.includes(option.value)}
            // prevent the menu from closing on each toggle so the user can pick multiple.
            onSelect={(event) => event.preventDefault()}
            onCheckedChange={(checked) => onFilterChange(option.value, Boolean(checked))}
          >
            {option.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
