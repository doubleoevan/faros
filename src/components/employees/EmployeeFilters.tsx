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

  const toggle = async (
    setter: (value: string[]) => Promise<URLSearchParams>,
    current: string[],
    value: string,
    next: boolean,
  ) => {
    const updated = next ? [...current, value] : current.filter((entry) => entry !== value)
    await setter(updated)
    // any filter change reshapes the result set; the existing cursor trail no longer applies.
    await setCursors([])
  }

  const onReset = async () => {
    await Promise.all([setTeams([]), setStatuses([]), setAccountTypes([]), setCursors([])])
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <FilterDropdown
        label="Team"
        selectedCount={teams.length}
        options={teamOptions.map((team) => ({ value: team.uid, label: team.name }))}
        selectedValues={teams}
        onToggle={(value, next) => toggle(setTeams, teams, value, next)}
      />
      <FilterDropdown
        label="Status"
        selectedCount={statuses.length}
        options={statusOptions.map((status) => ({ value: status, label: status }))}
        selectedValues={statuses}
        onToggle={(value, next) => toggle(setStatuses, statuses, value, next)}
      />
      <FilterDropdown
        label="Accounts"
        selectedCount={accountTypes.length}
        options={accountTypeOptions.map((account) => ({
          value: account.type,
          label: account.source,
        }))}
        selectedValues={accountTypes}
        onToggle={(value, next) => toggle(setAccountTypes, accountTypes, value, next)}
      />
      {hasActiveFilter && (
        <Button variant="ghost" size="sm" onClick={onReset} aria-label="Reset filters">
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
  onToggle: (value: string, next: boolean) => void | Promise<void>
}

function FilterDropdown({
  label,
  selectedCount,
  options,
  selectedValues,
  onToggle,
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
            onCheckedChange={(checked) => onToggle(option.value, Boolean(checked))}
          >
            {option.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
