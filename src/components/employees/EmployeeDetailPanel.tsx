import { X } from 'lucide-react'
import { useQuery } from '@apollo/client'
import { useEffect } from 'react'
import { parseAsString, useQueryState } from 'nuqs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { EmployeeQuery } from '@/lib/apollo/generated'
import { EmployeeDocument } from '@/lib/apollo/generated'
import { cn, toInitials } from '@/lib/utils'
import { AccountIcons } from './AccountIcons'
import { EmployeeStatusBadge } from './EmployeeStatusBadge'

type Employee = NonNullable<EmployeeQuery['employee']>

export function EmployeeDetailPanel() {
  const [viewId, setViewId] = useQueryState('view', parseAsString)

  // cache-first: returns immediately from the normalized cache when the employee was already
  // fetched by the list query (normal click flow). falls back to a network request on hard
  // refresh when the cache is empty — the Query.employee field policy in apollo/client.ts
  // ensures the cache lookup finds the normalized entity without an extra round-trip.
  const { data, loading } = useQuery(EmployeeDocument, {
    variables: { id: viewId ?? '' },
    skip: !viewId,
    fetchPolicy: 'cache-first',
  })

  const employee = data?.employee ?? null
  const isOpen = Boolean(viewId)
  const handleClose = () => void setViewId(null)

  // close if the query resolves with no employee (id not found in the API).
  useEffect(() => {
    if (viewId && !loading && !employee) {
      void setViewId(null)
    }
  }, [employee, loading, setViewId, viewId])

  return (
    // width transition pushes the table content left as the panel opens — matches Figma layout.
    <aside
      aria-label="Employee details"
      className={cn(
        'shrink-0 overflow-hidden border-l transition-[width] duration-300',
        isOpen ? 'w-96' : 'w-0',
      )}
    >
      <div className="flex h-full w-96 flex-col overflow-y-auto">
        {loading && <EmployeeDetailPlaceholder />}
        {employee && <EmployeeDetailContents employee={employee} onClose={handleClose} />}
      </div>
    </aside>
  )
}

function EmployeeDetailContents({
  employee,
  onClose,
}: {
  employee: Employee
  onClose: () => void
}) {
  const displayName = employee.name ?? 'Unnamed'
  const teamLabel = employee.teams.map((team) => team.name).join(', ') || '—'
  return (
    <>
      <div className="flex items-start justify-between border-b p-4">
        <div className="flex items-center gap-3">
          <Avatar size="lg">
            {employee.photoUrl && <AvatarImage src={employee.photoUrl} alt={displayName} />}
            <AvatarFallback>{toInitials(employee.name)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold">{displayName}</h2>
            <EmployeeStatusBadge
              status={employee.trackingStatus}
              category={employee.trackingCategory}
              className="self-start"
            />
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="Close panel"
          className="shrink-0"
        >
          <X className="size-4" />
        </Button>
      </div>
      <div className="flex flex-col gap-4 p-4">
        <DetailRow label="UID" value={employee.uid} />
        <DetailRow label="Teams" value={teamLabel} />
        <DetailRow
          label="Connected Accounts"
          value={<AccountIcons accounts={employee.accounts} />}
        />
      </div>
      {/* Phase 2 mount point — AI insights component lands here once Task 11+ ships. */}
      <section
        aria-label="AI insights"
        data-testid="ai-insights-mount"
        className="border-muted-foreground/30 bg-muted/40 mx-4 rounded-md border border-dashed p-4 text-sm"
      >
        <h3 className="text-foreground font-medium">AI insights</h3>
        <p className="text-muted-foreground mt-1">
          This is where AI-generated activity insights for {displayName} will appear (Phase 2).
        </p>
      </section>
    </>
  )
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-muted-foreground text-xs font-medium uppercase">{label}</span>
      <div className="text-sm">{value}</div>
    </div>
  )
}

function EmployeeDetailPlaceholder() {
  return (
    <>
      <div className="flex items-start justify-between border-b p-4">
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-full" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-4 p-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-28" />
      </div>
    </>
  )
}
