import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@/test/render'
import { server } from '@/test/mocks/server'
import {
  employeesEmptyHandler,
  employeesErrorHandler,
  employeesPagedHandler,
} from '@/test/mocks/handlers'
import { paginationFixtures } from '@/test/mocks/fixtures'
import { EMPLOYEES_PAGE_SIZE, EmployeeTable } from './EmployeeTable'

const TOTAL_FIXTURES = paginationFixtures.length

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

describe('EmployeeTable sorting', () => {
  it('cycles the Name header through asc, desc, and unsorted', async () => {
    const user = userEvent.setup()
    render(<EmployeeTable />)

    await screen.findByText('Ada Lovelace')
    const nameHeader = screen.getByRole('button', { name: 'Name' })

    await user.click(nameHeader)
    await waitFor(() => {
      expect(window.location.search).toContain('sort=name')
      expect(window.location.search).not.toContain('sort=-')
    })
    let rows = screen.getAllByRole('row').slice(1)
    expect(rows[0]).toHaveTextContent('Ada Lovelace')
    expect(rows[1]).toHaveTextContent('Grace Hopper')

    await user.click(nameHeader)
    await waitFor(() => {
      expect(window.location.search).toContain('sort=-name')
    })
    rows = screen.getAllByRole('row').slice(1)
    expect(rows[0]).toHaveTextContent('Grace Hopper')
    expect(rows[1]).toHaveTextContent('Ada Lovelace')

    await user.click(nameHeader)
    await waitFor(() => {
      expect(window.location.search).not.toContain('sort=')
    })
  })
})

describe('EmployeeTable pagination', () => {
  it('shows the page range, advances on Next, and walks back on Previous', async () => {
    server.use(employeesPagedHandler(paginationFixtures, { pageSize: EMPLOYEES_PAGE_SIZE }))
    const user = userEvent.setup()
    render(<EmployeeTable />)

    expect(await screen.findByText('Employee 1')).toBeInTheDocument()
    expect(screen.getByText(`Employee ${EMPLOYEES_PAGE_SIZE}`)).toBeInTheDocument()
    expect(screen.queryByText(`Employee ${EMPLOYEES_PAGE_SIZE + 1}`)).not.toBeInTheDocument()
    expect(screen.getByText(`1-${EMPLOYEES_PAGE_SIZE} of ${TOTAL_FIXTURES}`)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /previous page/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /next page/i })).toBeEnabled()

    await user.click(screen.getByRole('button', { name: /next page/i }))
    expect(await screen.findByText(`Employee ${EMPLOYEES_PAGE_SIZE + 1}`)).toBeInTheDocument()
    expect(screen.getByText(`Employee ${TOTAL_FIXTURES}`)).toBeInTheDocument()
    expect(screen.queryByText('Employee 1')).not.toBeInTheDocument()
    expect(
      await screen.findByText(`${EMPLOYEES_PAGE_SIZE + 1}-${TOTAL_FIXTURES} of ${TOTAL_FIXTURES}`),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /previous page/i })).toBeEnabled()

    await user.click(screen.getByRole('button', { name: /previous page/i }))
    expect(await screen.findByText('Employee 1')).toBeInTheDocument()
    expect(screen.getByText(`1-${EMPLOYEES_PAGE_SIZE} of ${TOTAL_FIXTURES}`)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /previous page/i })).toBeDisabled()
  })

  it('disables Next on the final page', async () => {
    server.use(employeesPagedHandler(paginationFixtures, { pageSize: EMPLOYEES_PAGE_SIZE }))
    const user = userEvent.setup()
    render(<EmployeeTable />)

    await screen.findByText('Employee 1')
    await user.click(screen.getByRole('button', { name: /next page/i }))

    expect(await screen.findByText(`Employee ${TOTAL_FIXTURES}`)).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /next page/i })).toBeDisabled()
    })
  })

  it('restores both arrows on refresh by reading the trail from the URL', async () => {
    server.use(employeesPagedHandler(paginationFixtures, { pageSize: EMPLOYEES_PAGE_SIZE }))
    // simulate a refreshed mid-pagination URL where the trail came along for the ride.
    window.history.replaceState(null, '', `/?cursor=${String(EMPLOYEES_PAGE_SIZE - 1)}`)
    const user = userEvent.setup()
    render(<EmployeeTable />)

    expect(await screen.findByText(`Employee ${EMPLOYEES_PAGE_SIZE + 1}`)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /previous page/i })).toBeEnabled()

    await user.click(screen.getByRole('button', { name: /previous page/i }))
    expect(await screen.findByText('Employee 1')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /previous page/i })).toBeDisabled()
  })
})
