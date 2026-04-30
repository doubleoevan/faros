import { parseAsArrayOf, parseAsString, useQueryState } from 'nuqs'
import { useMemo } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { EmployeesQuery } from '@/lib/apollo/generated'
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue'
import { useEmployees } from '@/lib/hooks/useEmployees'
import { cn, compareNullableStrings, toInitials } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { AccountIcons } from './AccountIcons'
import { EmployeePagination } from './EmployeePagination'
import { EmployeeStatusBadge } from './EmployeeStatusBadge'
import { nextSortValue, sortDirectionForField } from './sort'
import { SortableTableHead } from './SortableTableHead'

export const EMPLOYEES_PAGE_SIZE = 25
const SEARCH_DEBOUNCE_MS = 300
const SKELETON_ROW_COUNT = 6
const COLUMN_COUNT = 5

type EmployeeRow = EmployeesQuery['employees']['edges'][number]['node']

export function EmployeeTable({ className }: { className?: string }) {
  // URL holds the forward trail (?cursor=A,B,C) so refresh and manual edits restore Prev.
  const [cursors, setCursors] = useQueryState(
    'cursor',
    parseAsArrayOf(parseAsString).withDefault([]),
  )
  const [search] = useQueryState('q', parseAsString)
  const debouncedSearch = useDebouncedValue(search ?? '', SEARCH_DEBOUNCE_MS)
  const [teams] = useQueryState('team', parseAsArrayOf(parseAsString).withDefault([]))
  const [statuses] = useQueryState('status', parseAsArrayOf(parseAsString).withDefault([]))
  const [accountTypes] = useQueryState('account', parseAsArrayOf(parseAsString).withDefault([]))
  const [sort, setSort] = useQueryState('sort', parseAsString)
  const currentCursor = cursors.length > 0 ? (cursors[cursors.length - 1] ?? null) : null

  // Apollo dedupes identical variable shapes, so passing `undefined` keeps cache slots stable
  // when a filter is unset rather than thrashing them with empty arrays.
  const filter =
    teams.length > 0 || statuses.length > 0 || accountTypes.length > 0
      ? {
          teams: teams.length > 0 ? teams : undefined,
          trackingStatuses: statuses.length > 0 ? statuses : undefined,
          accountTypes: accountTypes.length > 0 ? accountTypes : undefined,
        }
      : undefined

  const { data, loading, error } = useEmployees({
    first: EMPLOYEES_PAGE_SIZE,
    after: currentCursor,
    search: debouncedSearch || undefined,
    filter,
  })

  // schema has no orderBy arg — sort is client-side on the visible page only. see DEC.
  const employees = useMemo(
    () =>
      sortEmployees(
        data?.employees.edges.map((edge) => edge.node),
        sort,
      ),
    [data?.employees.edges, sort],
  )

  const totalCount = data?.employees.totalCount ?? 0
  const currentPageSize = employees.length
  // assumes prior pages were full; resolver guarantees that outside the last page.
  const pageOffset = cursors.length * EMPLOYEES_PAGE_SIZE
  const pageStart = totalCount === 0 || currentPageSize === 0 ? 0 : pageOffset + 1
  const pageEnd = pageStart === 0 ? 0 : pageOffset + currentPageSize
  const canGoNext = data?.employees.pageInfo.hasNextPage ?? false
  const canGoPrevious = cursors.length > 0

  // skip fetchMore: it writes to the original cache slot, then the URL change double-fetches.
  const handleNextPage = async () => {
    const endCursor = data?.employees.pageInfo.endCursor
    if (!endCursor) {
      return
    }
    await setCursors([...cursors, endCursor])
  }

  const handlePreviousPage = async () => {
    if (cursors.length === 0) {
      return
    }
    await setCursors(cursors.slice(0, -1))
  }

  const handleTableSort = (field: string) => () => {
    void setSort(nextSortValue(sort, field))
  }

  return (
    <div className={cn('rounded-md border', className)}>
      <Table>
        <TableHeader>
          <TableRow>
            <SortableTableHead
              field="name"
              currentSort={sort}
              onTableSort={handleTableSort('name')}
              className="w-[28%]"
            >
              Name
            </SortableTableHead>
            <SortableTableHead
              field="trackingStatus"
              currentSort={sort}
              onTableSort={handleTableSort('trackingStatus')}
              className="w-[16%]"
            >
              Tracking Status
            </SortableTableHead>
            <TableHead className="w-[26%]">Teams</TableHead>
            <TableHead className="w-[20%]">Accounts Connected</TableHead>
            <TableHead className="w-[10%]" aria-label="Row actions" />
          </TableRow>
        </TableHeader>
        <TableBody>
          <EmployeeTableContents
            employees={employees}
            isLoading={loading && !data}
            hasError={Boolean(error) && !data}
          />
        </TableBody>
      </Table>
      <EmployeePagination
        pageStart={pageStart}
        pageEnd={pageEnd}
        totalCount={totalCount}
        canGoPrevious={canGoPrevious}
        canGoNext={canGoNext}
        isLoading={loading}
        onPreviousPage={handlePreviousPage}
        onNextPage={handleNextPage}
        className="border-t"
      />
    </div>
  )
}

function EmployeeTableContents({
  employees,
  isLoading,
  hasError,
}: {
  employees: EmployeeRow[]
  isLoading: boolean
  hasError: boolean
}) {
  if (isLoading) {
    return <EmployeeTableSkeletonRows />
  }
  if (hasError) {
    return (
      <TableRow>
        <TableCell colSpan={COLUMN_COUNT} className="py-10 text-center">
          <div role="alert" className="text-destructive text-sm">
            Failed to load employees. Please retry.
          </div>
        </TableCell>
      </TableRow>
    )
  }
  if (employees.length === 0) {
    return (
      <TableRow>
        <TableCell colSpan={COLUMN_COUNT} className="py-10 text-center">
          <span className="text-muted-foreground text-sm">No employees found.</span>
        </TableCell>
      </TableRow>
    )
  }
  return (
    <>
      {employees.map((employee) => (
        <EmployeeTableRow key={employee.id} employee={employee} />
      ))}
    </>
  )
}

function sortEmployees(employees: EmployeeRow[] | undefined, sort: string | null): EmployeeRow[] {
  if (!employees) {
    return []
  }
  if (!sort) {
    return employees
  }
  const ascName = sortDirectionForField(sort, 'name')
  const ascStatus = sortDirectionForField(sort, 'trackingStatus')
  if (ascName !== null) {
    return [...employees].sort((first, second) =>
      compareNullableStrings(first.name, second.name, ascName),
    )
  }
  if (ascStatus !== null) {
    return [...employees].sort((first, second) =>
      compareNullableStrings(first.trackingStatus, second.trackingStatus, ascStatus),
    )
  }
  return employees
}

function EmployeeTableRow({ employee }: { employee: EmployeeRow }) {
  const [, setViewId] = useQueryState('view', parseAsString)
  const displayName = employee.name ?? 'Unnamed'
  const initials = toInitials(employee.name)
  const teamLabel = employee.teams.map((team) => team.name).join(', ') || '—'
  return (
    <TableRow>
      <TableCell className="py-3">
        <div className="flex items-center gap-3">
          <Avatar size="sm">
            {employee.photoUrl && <AvatarImage src={employee.photoUrl} alt={displayName} />}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <span className="font-medium">{displayName}</span>
        </div>
      </TableCell>
      <TableCell className="py-3">
        <EmployeeStatusBadge status={employee.trackingStatus} />
      </TableCell>
      <TableCell className="py-3">
        <span className="text-muted-foreground truncate text-sm">{teamLabel}</span>
      </TableCell>
      <TableCell className="py-3">
        <AccountIcons accounts={employee.accounts} />
      </TableCell>
      <TableCell className="py-3 text-right">
        <Button
          variant="outline"
          size="sm"
          onClick={() => void setViewId(employee.id)}
          aria-label={`View ${displayName}`}
        >
          View
        </Button>
      </TableCell>
    </TableRow>
  )
}

function EmployeeTableSkeletonRows() {
  return (
    <>
      {Array.from({ length: SKELETON_ROW_COUNT }).map((_, index) => (
        <TableRow key={index} aria-hidden="true" data-testid="employee-table-skeleton-row">
          <TableCell className="py-3">
            <div className="flex items-center gap-3">
              <Skeleton className="size-6 rounded-full" />
              <Skeleton className="h-4 w-32" />
            </div>
          </TableCell>
          <TableCell className="py-3">
            <Skeleton className="h-5 w-20 rounded-full" />
          </TableCell>
          <TableCell className="py-3">
            <Skeleton className="h-4 w-40" />
          </TableCell>
          <TableCell className="py-3">
            <Skeleton className="h-5 w-24" />
          </TableCell>
          <TableCell className="py-3 text-right">
            <Skeleton className="ml-auto h-8 w-14 rounded-md" />
          </TableCell>
        </TableRow>
      ))}
    </>
  )
}
