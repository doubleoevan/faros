import { graphql, HttpResponse } from 'msw'
import type { EmployeesQuery } from '@/lib/apollo/generated'
import { employeeFixtures, makeEmployeesResponse } from './fixtures'

type EmployeesVariables = {
  first?: number | null
  after?: string | null
}

type EmployeeRow = EmployeesQuery['employees']['edges'][number]['node']

// default success handler. tests opt into other modes (error, empty, paged) via server.use(...).
export const handlers = [
  graphql.query<EmployeesQuery>('Employees', () => {
    return HttpResponse.json({ data: makeEmployeesResponse(employeeFixtures) })
  }),
]

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
