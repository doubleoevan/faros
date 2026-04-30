import { EmployeeFilters } from '@/components/employees/EmployeeFilters'
import { EmployeeSearch } from '@/components/employees/EmployeeSearch'
import { EmployeeTable } from '@/components/employees/EmployeeTable'

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
      <EmployeeTable />
    </main>
  )
}
