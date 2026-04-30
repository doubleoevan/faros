import { ErrorBoundary } from 'react-error-boundary'
import { EmployeeDetailPanel } from '@/components/employees/EmployeeDetailPanel'
import { EmployeeFilters } from '@/components/employees/EmployeeFilters'
import { EmployeeSearch } from '@/components/employees/EmployeeSearch'
import { EmployeeTable } from '@/components/employees/EmployeeTable'
import { EmployeeTableErrorFallback } from '@/components/employees/EmployeeTableErrorFallback'
import { apolloClient } from '@/lib/apollo/client'

export function EmployeesDashboard() {
  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold">Employees</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Easily assign employees to teams, include them for tracking in team productivity status,
          and manage their connected accounts.
        </p>
      </header>
      <EmployeeSearch />
      <EmployeeFilters />
      {/* per-region boundary: a table render-throw shouldn't take search/filters/detail with it.
          resetStore wipes the cache and refetches every active query, so any stale entry that
          caused the throw is gone and every visible region (filters too) shows fresh data after
          recovery. URL state is preserved. */}
      <ErrorBoundary
        FallbackComponent={EmployeeTableErrorFallback}
        onReset={() => {
          void apolloClient.resetStore()
        }}
      >
        <EmployeeTable />
      </ErrorBoundary>
      <EmployeeDetailPanel />
    </main>
  )
}
