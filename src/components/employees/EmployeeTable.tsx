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

export const EMPLOYEES_PAGE_SIZE = 5
const SEARCH_DEBOUNCE_MS = 300
const SKELETON_ROW_COUNT = 5
const COLUMN_COUNT = 5

// per-team palette: known team uids get specific tones (matches Figma); others fall back to a
// stable hash so the same team always gets the same color even when not in the known list.
const KNOWN_TEAM_TONES: Record<string, string> = {
  frontend: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  backend: 'border-sky-200 bg-sky-50 text-sky-800',
  'data-platform': 'border-amber-100 bg-amber-50 text-amber-800',
  data: 'border-amber-100 bg-amber-50 text-amber-800',
  security: 'border-rose-200 bg-rose-50 text-rose-800',
  platform: 'border-violet-200 bg-violet-50 text-violet-800',
  infra: 'border-cyan-200 bg-cyan-50 text-cyan-800',
  mobile: 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-800',
}

const FALLBACK_TEAM_TONES = [
  'border-amber-100 bg-amber-50 text-amber-800',
  'border-sky-200 bg-sky-50 text-sky-800',
  'border-emerald-200 bg-emerald-50 text-emerald-800',
  'border-violet-200 bg-violet-50 text-violet-800',
  'border-rose-200 bg-rose-50 text-rose-800',
  'border-cyan-200 bg-cyan-50 text-cyan-800',
] as const

// mock-server cursor format: base64 of `cursor:<index-of-last-item-on-prior-page>`. used to
// synthesize cursors for pages we haven't visited yet so the page-jump dropdown can make
// arbitrary forward jumps. couples this code to the mock-server's format — if a real API
// ships opaque or different cursors, switch to a sequential fetchMore walk.
function synthesizeCursorForPage(page: number, pageSize: number): string {
  const lastIndexOfPriorPage = (page - 1) * pageSize - 1
  return btoa(`cursor:${lastIndexOfPriorPage}`)
}

function teamTone(uid: string): string {
  const tone = KNOWN_TEAM_TONES[uid]
  if (tone) {
    return tone
  }
  let hash = 0
  for (let index = 0; index < uid.length; index += 1) {
    hash = (hash * 31 + uid.charCodeAt(index)) >>> 0
  }
  return FALLBACK_TEAM_TONES[hash % FALLBACK_TEAM_TONES.length] ?? FALLBACK_TEAM_TONES[0]
}

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

  const handleSelectPage = async (page: number) => {
    // back-jump to a visited page — slice the existing trail.
    if (page <= cursors.length + 1) {
      await setCursors(cursors.slice(0, page - 1))
      return
    }
    // forward-jump beyond visited pages — synthesize the trail using the mock-server's
    // cursor format. brittle if the real API ever uses opaque/different cursors; if that
    // happens, swap to sequential fetchMore walks (slower, format-agnostic).
    const newCursors: string[] = []
    for (let nextPage = 2; nextPage <= page; nextPage += 1) {
      newCursors.push(synthesizeCursorForPage(nextPage, EMPLOYEES_PAGE_SIZE))
    }
    await setCursors(newCursors)
  }

  return (
    <div className={cn('overflow-hidden rounded-md border', className)}>
      <Table className="border-separate border-spacing-0 [&_th]:font-normal">
        <TableHeader className="bg-muted">
          <TableRow>
            <SortableTableHead
              field="name"
              currentSort={sort}
              onTableSort={handleTableSort('name')}
              className="bg-muted sticky left-0 z-20 w-[280px] min-w-[280px] border-r border-b"
            >
              Name
            </SortableTableHead>
            <SortableTableHead
              field="trackingStatus"
              currentSort={sort}
              onTableSort={handleTableSort('trackingStatus')}
              className="min-w-[160px] border-b"
            >
              Tracking Status
            </SortableTableHead>
            <TableHead className="min-w-[200px] border-b">Teams</TableHead>
            <TableHead className="min-w-[180px] border-b">Accounts Connected</TableHead>
            <TableHead
              className="bg-muted sticky right-0 z-20 w-[96px] min-w-[96px] border-b border-l"
              aria-label="Row actions"
            />
          </TableRow>
        </TableHeader>
        <TableBody className="[&_tr]:border-0">
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
        pageSize={EMPLOYEES_PAGE_SIZE}
        currentPage={cursors.length + 1}
        canGoPrevious={canGoPrevious}
        canGoNext={canGoNext}
        isLoading={loading}
        onPreviousPage={handlePreviousPage}
        onNextPage={handleNextPage}
        onSelectPage={handleSelectPage}
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
  const [viewId, setViewId] = useQueryState('view', parseAsString)
  const displayName = employee.name ?? 'Unnamed'
  const initials = toInitials(employee.name)
  const isSelected = viewId === employee.id
  return (
    <TableRow data-state={isSelected ? 'selected' : undefined} className="group">
      <TableCell
        className={cn(
          'sticky left-0 z-10 border-r py-3',
          isSelected ? 'bg-muted' : 'bg-background group-hover:bg-muted/50',
        )}
      >
        <div className="flex items-center gap-3">
          <Avatar>
            {employee.photoUrl && <AvatarImage src={employee.photoUrl} alt={displayName} />}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col leading-tight">
            <span className="text-sky-700">{displayName}</span>
            {employee.email && (
              <span className="text-muted-foreground text-xs">{employee.email}</span>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell className="py-3">
        <EmployeeStatusBadge
          status={employee.trackingStatus}
          category={employee.trackingCategory}
        />
      </TableCell>
      <TableCell className="py-3">
        <TeamPills teams={employee.teams} />
      </TableCell>
      <TableCell className="py-3">
        <AccountIcons accounts={employee.accounts} />
      </TableCell>
      <TableCell
        className={cn(
          'sticky right-0 z-10 border-l py-3 text-center',
          isSelected ? 'bg-muted' : 'bg-background group-hover:bg-muted/50',
        )}
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() => void setViewId(employee.id)}
          aria-label={`View ${displayName}`}
          className={cn('font-normal', isSelected && 'border-sky-600')}
        >
          View
        </Button>
      </TableCell>
    </TableRow>
  )
}

function TeamPills({ teams }: { teams: ReadonlyArray<{ id: string; uid: string; name: string }> }) {
  if (teams.length === 0) {
    return <span className="text-muted-foreground text-xs">—</span>
  }
  return (
    <ul className="flex flex-wrap gap-1.5">
      {teams.map((team) => (
        <li
          key={team.id}
          className={cn(
            'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium',
            teamTone(team.uid),
          )}
        >
          {team.uid}
        </li>
      ))}
    </ul>
  )
}

function EmployeeTableSkeletonRows() {
  return (
    <>
      {Array.from({ length: SKELETON_ROW_COUNT }).map((_, index) => (
        <TableRow key={index} aria-hidden="true" data-testid="employee-table-skeleton-row">
          <TableCell className="bg-background sticky left-0 z-10 border-r py-3">
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
          <TableCell className="bg-background sticky right-0 z-10 border-l py-3 text-center">
            <Skeleton className="mx-auto h-8 w-14 rounded-md" />
          </TableCell>
        </TableRow>
      ))}
    </>
  )
}
