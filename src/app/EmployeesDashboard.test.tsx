import userEvent from '@testing-library/user-event'
import { parseAsString, useQueryState } from 'nuqs'
import { describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@/test/render'
import { server } from '@/test/mocks/server'
import { employeesSearchHandler, filterOptionsHandler } from '@/test/mocks/handlers'
import { employeeFixtures } from '@/test/mocks/fixtures'
import { EmployeesDashboard } from './EmployeesDashboard'

// helper component that writes ?q= via nuqs from outside EmployeeSearch — stand-in for
// any external URL change (browser back, paste link, sibling component) in the test env.
function ExternalQuerySetter({ to }: { to: string }) {
  const [, setSearch] = useQueryState('q', parseAsString)
  return (
    <button type="button" onClick={() => void setSearch(to)}>
      set-external-q
    </button>
  )
}

describe('EmployeesDashboard', () => {
  it('renders the dashboard heading and the employees table', async () => {
    render(<EmployeesDashboard />)
    expect(screen.getByRole('heading', { name: /employees/i })).toBeInTheDocument()
    expect(await screen.findByRole('columnheader', { name: /name/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /tracking status/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /teams/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /accounts connected/i })).toBeInTheDocument()
  })

  it('debounces typing in the search input and refetches with the search variable', async () => {
    server.use(employeesSearchHandler(employeeFixtures))
    const user = userEvent.setup()
    render(<EmployeesDashboard />)

    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument()
    expect(screen.getByText('Grace Hopper')).toBeInTheDocument()

    await user.type(screen.getByRole('searchbox', { name: /search employees/i }), 'grace')

    await waitFor(() => {
      expect(screen.queryByText('Ada Lovelace')).not.toBeInTheDocument()
    })
    expect(screen.getByText('Grace Hopper')).toBeInTheDocument()
  })

  it('clears the cursor trail when the search term changes', async () => {
    server.use(employeesSearchHandler(employeeFixtures))
    const user = userEvent.setup()
    window.history.replaceState(null, '', '/?cursor=stale_cursor')
    render(<EmployeesDashboard />)

    await screen.findByText('Ada Lovelace')
    await user.type(screen.getByRole('searchbox', { name: /search employees/i }), 'grace')

    await waitFor(() => {
      expect(window.location.search).not.toContain('cursor=')
    })
  })

  it('renders an × clear button that resets the search and the cursor trail', async () => {
    server.use(employeesSearchHandler(employeeFixtures))
    const user = userEvent.setup()
    render(<EmployeesDashboard />)

    // type something to guarantee the clear button is visible regardless of prior state.
    const searchbox = screen.getByRole('searchbox', { name: /search employees/i })
    await user.type(searchbox, 'grace')
    expect(screen.getByRole('button', { name: /clear search/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /clear search/i }))

    expect(searchbox).toHaveValue('')
    expect(screen.queryByRole('button', { name: /clear search/i })).not.toBeInTheDocument()
  })

  it('applies a tracking-status filter and clears the cursor trail', async () => {
    server.use(employeesSearchHandler(employeeFixtures), filterOptionsHandler(employeeFixtures))
    const user = userEvent.setup()
    window.history.replaceState(null, '', '/?cursor=stale_cursor')
    window.dispatchEvent(new PopStateEvent('popstate'))
    render(<EmployeesDashboard />)

    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument()
    expect(screen.getByText('Grace Hopper')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^status/i }))
    await user.click(await screen.findByRole('menuitemcheckbox', { name: 'Ignored' }))

    await waitFor(() => {
      expect(screen.queryByText('Ada Lovelace')).not.toBeInTheDocument()
    })
    expect(screen.getByText('Grace Hopper')).toBeInTheDocument()
    await waitFor(() => {
      expect(window.location.search).not.toContain('cursor=')
    })
    await waitFor(() => {
      expect(window.location.search).toContain('status=Ignored')
    })
  })

  it('reset clears every active filter at once', async () => {
    server.use(employeesSearchHandler(employeeFixtures), filterOptionsHandler(employeeFixtures))
    const user = userEvent.setup()
    window.history.replaceState(null, '', '/?status=Ignored&account=cal')
    window.dispatchEvent(new PopStateEvent('popstate'))
    render(<EmployeesDashboard />)

    const resetButton = await screen.findByRole('button', { name: /reset filters/i })
    await user.click(resetButton)

    await waitFor(() => {
      expect(window.location.search).not.toContain('status=')
    })
    expect(window.location.search).not.toContain('account=')
    expect(screen.queryByRole('button', { name: /reset filters/i })).not.toBeInTheDocument()
  })

  it('updates the search input when ?q= changes from outside the component', async () => {
    server.use(employeesSearchHandler(employeeFixtures))
    const user = userEvent.setup()
    render(
      <>
        <EmployeesDashboard />
        <ExternalQuerySetter to="external" />
      </>,
    )

    await user.click(screen.getByRole('button', { name: 'set-external-q' }))

    const searchbox = screen.getByRole('searchbox', { name: /search employees/i })
    await waitFor(() => {
      expect(searchbox).toHaveValue('external')
    })
  })
})
