import { graphql, HttpResponse } from 'msw'
import type { EmployeeFilter, EmployeesQuery, FilterOptionsQuery } from '@/lib/apollo/generated'
import { employeeFixtures, makeEmployeesResponse } from './fixtures'

type EmployeesVariables = {
  first?: number | null
  after?: string | null
  search?: string | null
  filter?: EmployeeFilter | null
}

type EmployeeRow = EmployeesQuery['employees']['edges'][number]['node']

// default success handlers. tests opt into other modes (error, empty, paged) via server.use(...).
export const handlers = [
  graphql.query<EmployeesQuery>('Employees', () => {
    return HttpResponse.json({ data: makeEmployeesResponse(employeeFixtures) })
  }),
  filterOptionsHandler(employeeFixtures),
]

// search-aware handler that filters fixtures by case-insensitive name match and the
// EmployeeFilter input (teams, trackingStatuses, accountTypes — OR within each group).
export function employeesSearchHandler(employeeRows: EmployeeRow[]) {
  return graphql.query<EmployeesQuery, EmployeesVariables>('Employees', ({ variables }) => {
    const term = variables.search?.toLowerCase().trim() ?? ''
    const filter = variables.filter ?? undefined
    const matches = employeeRows.filter((employee) => {
      if (term && !employee.name?.toLowerCase().includes(term)) {
        return false
      }
      if (filter?.teams && filter.teams.length > 0) {
        if (!employee.teams.some((team) => filter.teams?.includes(team.uid))) {
          return false
        }
      }
      if (filter?.trackingStatuses && filter.trackingStatuses.length > 0) {
        if (
          !employee.trackingStatus ||
          !filter.trackingStatuses.includes(employee.trackingStatus)
        ) {
          return false
        }
      }
      if (filter?.accountTypes && filter.accountTypes.length > 0) {
        if (!employee.accounts.some((account) => filter.accountTypes?.includes(account.type))) {
          return false
        }
      }
      return true
    })
    return HttpResponse.json({ data: makeEmployeesResponse(matches) })
  })
}

// filter dropdown values — derived from the fixture set, mirroring the resolver.
export function filterOptionsHandler(employeeRows: EmployeeRow[]) {
  return graphql.query<FilterOptionsQuery>('FilterOptions', () => {
    const teamMap = new Map<string, { uid: string; name: string }>()
    const statusSet = new Set<string>()
    const accountMap = new Map<string, { type: string; source: string }>()
    for (const employee of employeeRows) {
      for (const team of employee.teams) {
        teamMap.set(team.uid, { uid: team.uid, name: team.name })
      }
      if (employee.trackingStatus) {
        statusSet.add(employee.trackingStatus)
      }
      for (const account of employee.accounts) {
        accountMap.set(account.type, { type: account.type, source: account.source })
      }
    }
    return HttpResponse.json({
      data: {
        __typename: 'Query',
        filterOptions: {
          __typename: 'FilterOptions',
          teams: [...teamMap.values()].map((team) => ({ __typename: 'TeamOption', ...team })),
          trackingStatuses: [...statusSet].sort(),
          accountTypes: [...accountMap.values()].map((account) => ({
            __typename: 'AccountTypeOption',
            ...account,
          })),
        },
      },
    })
  })
}

export function employeesEmptyHandler() {
  return graphql.query<EmployeesQuery>('Employees', () => {
    return HttpResponse.json({ data: makeEmployeesResponse([]) })
  })
}

export function employeesErrorHandler() {
  return graphql.query('Employees', () => {
    return HttpResponse.json({ errors: [{ message: 'Internal server error' }] }, { status: 500 })
  })
}

// pageable handler with numeric-index cursors so tests can assert exact pagination.
export function employeesPagedHandler(
  employeeRows: EmployeeRow[],
  options: { pageSize?: number } = {},
) {
  const pageSize = options.pageSize ?? 2
  return graphql.query<EmployeesQuery, EmployeesVariables>('Employees', ({ variables }) => {
    const startIndex = variables.after ? Number.parseInt(variables.after, 10) + 1 : 0
    const pageRows = employeeRows.slice(startIndex, startIndex + pageSize)
    const lastIndex = startIndex + pageRows.length - 1
    const pageResponse: EmployeesQuery = {
      __typename: 'Query',
      employees: {
        __typename: 'EmployeeConnection',
        totalCount: employeeRows.length,
        edges: pageRows.map((employee, index) => ({
          __typename: 'EmployeeEdge',
          cursor: String(startIndex + index),
          node: employee,
        })),
        pageInfo: {
          __typename: 'PageInfo',
          hasNextPage: lastIndex < employeeRows.length - 1,
          hasPreviousPage: startIndex > 0,
          startCursor: pageRows.length > 0 ? String(startIndex) : null,
          endCursor: pageRows.length > 0 ? String(lastIndex) : null,
        },
      },
    }
    return HttpResponse.json({ data: pageResponse })
  })
}
