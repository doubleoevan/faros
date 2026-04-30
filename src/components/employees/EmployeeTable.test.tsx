import { describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@/test/render'
import { server } from '@/test/mocks/server'
import { employeesEmptyHandler, employeesErrorHandler } from '@/test/mocks/handlers'
import { EmployeeTable } from './EmployeeTable'

describe('EmployeeTable', () => {
  it('renders skeleton rows while loading then employees from the response', async () => {
    render(<EmployeeTable />)
    expect(screen.getAllByTestId('employee-table-skeleton-row').length).toBeGreaterThan(0)
    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument()
    expect(screen.getByText('Grace Hopper')).toBeInTheDocument()
    expect(screen.getByText('Unnamed')).toBeInTheDocument()
    expect(screen.getByText('Platform')).toBeInTheDocument()
    expect(screen.getByAltText('GitHub')).toBeInTheDocument()
    expect(screen.queryAllByTestId('employee-table-skeleton-row').length).toBe(0)
  })

  it('renders the empty state when no employees are returned', async () => {
    server.use(employeesEmptyHandler())
    render(<EmployeeTable />)
    expect(await screen.findByText(/no employees found/i)).toBeInTheDocument()
  })

  it('renders the error state when the request fails', async () => {
    server.use(employeesErrorHandler())
    render(<EmployeeTable />)
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/failed to load employees/i)
    })
  })
})
