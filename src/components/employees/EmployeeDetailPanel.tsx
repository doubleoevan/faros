import { gql, useApolloClient } from '@apollo/client'
import { parseAsString, useQueryState } from 'nuqs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import type { EmployeesQuery } from '@/lib/apollo/generated'
import { toInitials } from '@/lib/utils'
import { AccountIcons } from './AccountIcons'
import { EmployeeStatusBadge } from './EmployeeStatusBadge'

type EmployeeRow = EmployeesQuery['employees']['edges'][number]['node']

export function EmployeeDetailPanel() {
  const client = useApolloClient()
  const [viewId, setViewId] = useQueryState('view', parseAsString)

  // read straight from the normalized cache — avoids a refetch on open. the Employees list
  // query already populated `Employee:<id>` with every field we render below.
  const employee = viewId
    ? client.cache.readFragment<EmployeeRow>({
        id: client.cache.identify({ __typename: 'Employee', id: viewId }),
        fragment: EMPLOYEE_DETAIL_FRAGMENT,
      })
    : null

  const isOpen = Boolean(viewId)
  const handleOpenChange = (next: boolean) => {
    if (!next) {
      void setViewId(null)
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="sm:max-w-md">
        {employee ? (
          <EmployeeDetailContents employee={employee} />
        ) : (
          <SheetHeader>
            <SheetTitle>Employee not available</SheetTitle>
            <SheetDescription>
              This employee is no longer in the loaded page. Close this panel and reopen from the
              table.
            </SheetDescription>
          </SheetHeader>
        )}
      </SheetContent>
    </Sheet>
  )
}

function EmployeeDetailContents({ employee }: { employee: EmployeeRow }) {
  const displayName = employee.name ?? 'Unnamed'
  const teamLabel = employee.teams.map((team) => team.name).join(', ') || '—'
  return (
    <>
      <SheetHeader className="border-b">
        <div className="flex items-center gap-3">
          <Avatar size="lg">
            {employee.photoUrl && <AvatarImage src={employee.photoUrl} alt={displayName} />}
            <AvatarFallback>{toInitials(employee.name)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-1">
            <SheetTitle className="text-lg">{displayName}</SheetTitle>
            <EmployeeStatusBadge status={employee.trackingStatus} className="self-start" />
          </div>
        </div>
        {/* sr-only — Radix Dialog requires a Description for screen readers; the visual
            design doesn't show one, so we hide it from sighted users. */}
        <SheetDescription className="sr-only">
          Profile details and AI insights for {displayName}.
        </SheetDescription>
      </SheetHeader>
      <div className="flex flex-col gap-4 px-4">
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

// fragment whose selection set matches the Employees list query exactly, so the cache lookup
// is guaranteed to hit on a row we just rendered.
const EMPLOYEE_DETAIL_FRAGMENT = gql`
  fragment EmployeeDetailFields on Employee {
    id
    uid
    name
    photoUrl
    trackingStatus
    teams {
      id
      uid
      name
    }
    accounts {
      type
      source
      uid
    }
  }
`
