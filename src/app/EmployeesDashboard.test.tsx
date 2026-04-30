import userEvent from '@testing-library/user-event'
import { parseAsString, useQueryState } from 'nuqs'
import { describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@/test/render'
import { server } from '@/test/mocks/server'
import { employeesSearchHandler, filterOptionsHandler } from '@/test/mocks/handlers'
import { employeeFixtures, makeEmployeeRow } from '@/test/mocks/fixtures'
import { EmployeeSearch } from '@/components/employees/EmployeeSearch'
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

    expect(await screen.findByText('Lando Calrissian')).toBeInTheDocument()
    expect(screen.getByText('Boba Fett')).toBeInTheDocument()

    await user.type(screen.getByRole('searchbox', { name: /search employees/i }), 'boba')

    await waitFor(() => {
      expect(screen.queryByText('Lando Calrissian')).not.toBeInTheDocument()
    })
    expect(screen.getByText('Boba Fett')).toBeInTheDocument()
  })

  it('clears the cursor trail when the search term changes', async () => {
    server.use(employeesSearchHandler(employeeFixtures))
    const user = userEvent.setup()
    window.history.replaceState(null, '', '/?cursor=stale_cursor')
    render(<EmployeesDashboard />)

    await screen.findByText('Lando Calrissian')
    await user.type(screen.getByRole('searchbox', { name: /search employees/i }), 'boba')

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
    await user.type(searchbox, 'boba')
    expect(screen.getByRole('button', { name: /clear search/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /clear search/i }))

    expect(searchbox).toHaveValue('')
    expect(screen.queryByRole('button', { name: /clear search/i })).not.toBeInTheDocument()
  })

  it('removing a filter via its chip clears the cursor trail', async () => {
    server.use(employeesSearchHandler(employeeFixtures), filterOptionsHandler(employeeFixtures))
    const user = userEvent.setup()
    // start with both a stale cursor and an applied filter — the cursor-clear on filter change
    // is what's under test. URL-preset avoids Radix submenu navigation in happy-dom.
    window.history.replaceState(null, '', '/?cursor=stale_cursor&status=Ignored')
    window.dispatchEvent(new PopStateEvent('popstate'))
    render(<EmployeesDashboard />)

    expect(await screen.findByText('Boba Fett')).toBeInTheDocument()
    expect(screen.queryByText('Lando Calrissian')).not.toBeInTheDocument()
    expect(window.location.search).toContain('status=Ignored')

    await user.click(screen.getByRole('button', { name: /remove status: ignored/i }))

    await waitFor(() => {
      expect(screen.getByText('Lando Calrissian')).toBeInTheDocument()
    })
    await waitFor(() => {
      expect(window.location.search).not.toContain('cursor=')
    })
    expect(window.location.search).not.toContain('status=')
  })

  it('combines status and account filters into the GraphQL request and renders only the intersection', async () => {
    // bob passes the status filter (Included) but lacks a vcs account — proves both filters
    // are AND-combined in the request, not just the status one. without him the test couldn't
    // distinguish "both filters applied" from "only status applied."
    const fixturesWithDisambiguator = [
      ...employeeFixtures,
      makeEmployeeRow({
        id: 'emp_4',
        uid: 'uid_4',
        name: 'Bob Builder',
        trackingStatus: 'Included',
        accounts: [
          { __typename: 'Account', type: 'cal', source: 'Google Calendar', uid: 'cal_bob' },
        ],
      }),
    ]
    server.use(
      employeesSearchHandler(fixturesWithDisambiguator),
      filterOptionsHandler(fixturesWithDisambiguator),
    )
    // preset both filters via URL — avoids fragile multi-dropdown click sequences in happy-dom.
    window.history.replaceState(null, '', '/?status=Included&account=vcs')
    window.dispatchEvent(new PopStateEvent('popstate'))

    render(<EmployeesDashboard />)

    // lando passes both filters (Included + vcs).
    expect(await screen.findByText('Lando Calrissian')).toBeInTheDocument()
    // boba fails status, bob passes status but fails account — both are excluded only when
    // both filters are applied together.
    expect(screen.queryByText('Boba Fett')).not.toBeInTheDocument()
    expect(screen.queryByText('Bob Builder')).not.toBeInTheDocument()
    expect(window.location.search).toContain('status=Included')
    expect(window.location.search).toContain('account=vcs')
  })

  it('opens the detail panel from a row View button without refetching', async () => {
    server.use(employeesSearchHandler(employeeFixtures), filterOptionsHandler(employeeFixtures))
    const user = userEvent.setup()
    render(<EmployeesDashboard />)

    await screen.findByText('Lando Calrissian')

    // count Employees requests so we can prove opening the panel doesn't trigger another one.
    let employeesRequests = 0
    server.events.on('request:start', ({ request }) => {
      if (request.method !== 'POST') {
        return
      }
      void request
        .clone()
        .text()
        .then((body) => {
          if (body.includes('"operationName":"Employees"')) {
            employeesRequests += 1
          }
        })
    })

    await user.click(screen.getByRole('button', { name: /view lando calrissian/i }))

    const panel = await screen.findByRole('complementary', { name: /employee details/i })
    expect(panel).toHaveTextContent('Lando Calrissian')
    expect(screen.getByTestId('ai-insights-mount')).toBeInTheDocument()
    // nuqs throttles URL writes — wait for the flush before asserting.
    await waitFor(() => {
      expect(window.location.search).toContain('view=emp_1')
    })
    expect(employeesRequests).toBe(0)
  })

  it('updates the search input when ?q= changes from outside the component', async () => {
    server.use(employeesSearchHandler(employeeFixtures))
    const user = userEvent.setup()
    // render the search in isolation to avoid the full dashboard's detail panel
    // reacting to any leftover ?view= URL state from a prior test.
    render(
      <>
        <EmployeeSearch />
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
