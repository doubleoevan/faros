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
import { useEmployees } from '@/lib/hooks/useEmployees'
import { cn } from '@/lib/utils'
import { AccountIcons } from './AccountIcons'
import { EmployeeStatusBadge } from './EmployeeStatusBadge'

const SKELETON_ROW_COUNT = 6
const COLUMN_COUNT = 4

type EmployeeNode = EmployeesQuery['employees']['edges'][number]['node']

export function EmployeeTable({ className }: { className?: string }) {
  const { data, loading, error } = useEmployees({ first: 25 })

  return (
    <div className={cn('rounded-md border', className)}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[32%]">Name</TableHead>
            <TableHead className="w-[18%]">Tracking Status</TableHead>
            <TableHead className="w-[28%]">Teams</TableHead>
            <TableHead className="w-[22%]">Accounts Connected</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <EmployeeTableContents
            data={data}
            isLoading={loading && !data}
            hasError={Boolean(error) && !data}
          />
        </TableBody>
      </Table>
    </div>
  )
}

function EmployeeTableContents({
  data,
  isLoading,
  hasError,
}: {
  data: EmployeesQuery | undefined
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
  const edges = data?.employees.edges ?? []
  if (edges.length === 0) {
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
      {edges.map((edge) => (
        <EmployeeTableRow key={edge.node.id} employee={edge.node} />
      ))}
    </>
  )
}

function EmployeeTableRow({ employee }: { employee: EmployeeNode }) {
  const displayName = employee.name ?? 'Unnamed'
  const initials = toInitials(employee.name)
  const teamLabel = employee.teams.map((team) => team.name).join(', ') || '—'
  return (
    <TableRow>
      <TableCell className="py-3">
        <div className="flex items-center gap-3">
          <Avatar size="sm">
            {employee.photoUrl ? <AvatarImage src={employee.photoUrl} alt={displayName} /> : null}
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
        </TableRow>
      ))}
    </>
  )
}

function toInitials(name: string | null | undefined): string {
  if (!name) {
    return '?'
  }
  const parts = name
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
  if (parts.length === 0) {
    return '?'
  }
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
  return (first + last).toUpperCase() || '?'
}
