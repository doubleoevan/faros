import { ErrorBoundary } from 'react-error-boundary'
import { EmployeeDetailPanel } from '@/components/employees/EmployeeDetailPanel'
import { EmployeeFilters } from '@/components/employees/EmployeeFilters'
import { EmployeeSearch } from '@/components/employees/EmployeeSearch'
import { EmployeeTable } from '@/components/employees/EmployeeTable'
import { EmployeeTableErrorFallback } from '@/components/employees/EmployeeTableErrorFallback'
import { apolloClient } from '@/lib/apollo/client'
import { emit, events } from '@/lib/telemetry'

export function EmployeesDashboard() {
  return (
    // flex row so the detail panel pushes the content left rather than overlaying it.
    <div className="flex min-h-svh">
      <div className="min-w-0 flex-1">
        <main className="mx-auto max-w-6xl space-y-6 p-6">
          <header>
            <h1 className="text-2xl font-semibold">Employees</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Easily assign employees to teams, include them for tracking in team productivity
              status, and manage their connected accounts.
            </p>
          </header>
          <div className="space-y-2">
            <EmployeeSearch />
            <EmployeeFilters />
          </div>
          {/* per-region boundary; resetStore wipes cache so recovery shows fresh data. */}
          <ErrorBoundary
            FallbackComponent={EmployeeTableErrorFallback}
            onReset={() => {
              void apolloClient.resetStore()
            }}
            onError={(error) => {
              emit(
                events.errorBoundaryTriggered(
                  'employee-table',
                  error instanceof Error ? error.message : String(error),
                ),
              )
            }}
          >
            <EmployeeTable />
          </ErrorBoundary>
        </main>
      </div>
      <EmployeeDetailPanel />
    </div>
  )
}
