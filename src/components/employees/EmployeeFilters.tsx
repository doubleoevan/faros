import { Plus, X } from 'lucide-react'
import { parseAsArrayOf, parseAsString, useQueryState } from 'nuqs'
import { Button } from '@/components/ui/button'
import { emit, events } from '@/lib/telemetry'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { FilterOptionsQuery } from '@/lib/apollo/generated'
import { useFilterOptions } from '@/lib/hooks/useFilterOptions'
import { cn } from '@/lib/utils'

const cursorStateOptions = parseAsArrayOf(parseAsString).withDefault([])

type FilterOptionsData = FilterOptionsQuery['filterOptions']

export function EmployeeFilters({ className }: { className?: string }) {
  const { data } = useFilterOptions()
  const [teams, setTeams] = useQueryState('team', cursorStateOptions)
  const [statuses, setStatuses] = useQueryState('status', cursorStateOptions)
  const [accountTypes, setAccountTypes] = useQueryState('account', cursorStateOptions)
  const [, setCursors] = useQueryState('cursor', cursorStateOptions)

  const filterOptions = data?.filterOptions

  const handleFilterChange = async (
    setFilters: (value: string[]) => Promise<URLSearchParams>,
    filters: string[],
    filterValue: string,
    shouldInclude: boolean,
    field: string,
  ) => {
    const updatedFilters = shouldInclude
      ? [...filters, filterValue]
      : filters.filter((entry) => entry !== filterValue)
    await setFilters(updatedFilters)
    // any filter change reshapes the result set so the existing cursor trail no longer applies.
    await setCursors([])
    emit(events.employeesFilterChanged(field, filterValue))
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <AddFilterDropdown
        filterOptions={filterOptions}
        selectedTeams={teams}
        selectedStatuses={statuses}
        selectedAccountTypes={accountTypes}
        onTeamFilterChange={(value, next) =>
          handleFilterChange(setTeams, teams, value, next, 'team')
        }
        onStatusFilterChange={(value, next) =>
          handleFilterChange(setStatuses, statuses, value, next, 'status')
        }
        onAccountFilterChange={(value, next) =>
          handleFilterChange(setAccountTypes, accountTypes, value, next, 'account')
        }
      />
      {teams.map((uid) => {
        const team = filterOptions?.teams.find((entry) => entry.uid === uid)
        return (
          <FilterChip
            key={`team-${uid}`}
            label="Team"
            value={team?.name ?? uid}
            onRemove={() => handleFilterChange(setTeams, teams, uid, false, 'team')}
          />
        )
      })}
      {statuses.map((status) => (
        <FilterChip
          key={`status-${status}`}
          label="Status"
          value={status}
          onRemove={() => handleFilterChange(setStatuses, statuses, status, false, 'status')}
        />
      ))}
      {accountTypes.map((type) => {
        const account = filterOptions?.accountTypes.find((entry) => entry.type === type)
        return (
          <FilterChip
            key={`account-${type}`}
            label="Account"
            value={account?.source ?? type}
            onRemove={() =>
              handleFilterChange(setAccountTypes, accountTypes, type, false, 'account')
            }
          />
        )
      })}
    </div>
  )
}

type AddFilterDropdownProps = {
  filterOptions: FilterOptionsData | undefined
  selectedTeams: ReadonlyArray<string>
  selectedStatuses: ReadonlyArray<string>
  selectedAccountTypes: ReadonlyArray<string>
  onTeamFilterChange: (uid: string, shouldInclude: boolean) => void | Promise<void>
  onStatusFilterChange: (status: string, shouldInclude: boolean) => void | Promise<void>
  onAccountFilterChange: (type: string, shouldInclude: boolean) => void | Promise<void>
}

function AddFilterDropdown({
  filterOptions,
  selectedTeams,
  selectedStatuses,
  selectedAccountTypes,
  onTeamFilterChange,
  onStatusFilterChange,
  onAccountFilterChange,
}: AddFilterDropdownProps) {
  const teamOptions = filterOptions?.teams ?? []
  const statusOptions = filterOptions?.trackingStatuses ?? []
  const accountTypeOptions = filterOptions?.accountTypes ?? []

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="font-normal">
          <Plus className="size-4" />
          Add Filter
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[10rem]">
        <DropdownMenuSub>
          <DropdownMenuSubTrigger disabled={teamOptions.length === 0}>Team</DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="min-w-[10rem]">
            {teamOptions.map((team) => (
              <DropdownMenuCheckboxItem
                key={team.uid}
                checked={selectedTeams.includes(team.uid)}
                onSelect={(event) => event.preventDefault()}
                onCheckedChange={(checked) => onTeamFilterChange(team.uid, Boolean(checked))}
              >
                {team.name}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger disabled={statusOptions.length === 0}>
            Status
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="min-w-[10rem]">
            {statusOptions.map((status) => (
              <DropdownMenuCheckboxItem
                key={status}
                checked={selectedStatuses.includes(status)}
                onSelect={(event) => event.preventDefault()}
                onCheckedChange={(checked) => onStatusFilterChange(status, Boolean(checked))}
              >
                {status}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger disabled={accountTypeOptions.length === 0}>
            Accounts
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="min-w-[10rem]">
            {accountTypeOptions.map((account) => (
              <DropdownMenuCheckboxItem
                key={account.type}
                checked={selectedAccountTypes.includes(account.type)}
                onSelect={(event) => event.preventDefault()}
                onCheckedChange={(checked) => onAccountFilterChange(account.type, Boolean(checked))}
              >
                {account.source}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function FilterChip({
  label,
  value,
  onRemove,
}: {
  label: string
  value: string
  onRemove: () => void | Promise<void>
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-md border border-sky-200 bg-sky-50 p-2 text-xs text-sky-900">
      <span>
        <span className="font-semibold">{label}:</span> {value}
      </span>
      <button
        type="button"
        onClick={() => void onRemove()}
        aria-label={`Remove ${label}: ${value}`}
        className="cursor-pointer hover:text-sky-700"
      >
        <X className="size-3.5" />
      </button>
    </span>
  )
}
