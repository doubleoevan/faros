import { delay, graphql, http, HttpResponse } from 'msw'
import type {
  EmployeeFilter,
  EmployeeQuery,
  EmployeeQueryVariables,
  EmployeesQuery,
  FilterOptionsQuery,
} from '@/lib/apollo/generated'
import { employeeFixtures, makeEmployeesResponse, makeInsightsResponse } from './fixtures'

const AI_BASE = 'http://localhost:4000'
export const AI_INSIGHTS_URL = `${AI_BASE}/api/ai/insights/:employeeId`

/** Returns a 200 response with normal confidence and no PII. */
export function aiInsightsSuccessHandler() {
  return http.get(AI_INSIGHTS_URL, () => HttpResponse.json(makeInsightsResponse()))
}

/** Returns a 200 response with confidence below the low-confidence threshold (0.2). */
export function aiInsightsLowConfidenceHandler() {
  return http.get(AI_INSIGHTS_URL, () =>
    HttpResponse.json(makeInsightsResponse({ confidence: 0.2 })),
  )
}

/** Returns a 200 response whose summary contains a phone number that the PII filter must redact. */
export function aiInsightsPiiHandler() {
  return http.get(AI_INSIGHTS_URL, () =>
    HttpResponse.json(
      makeInsightsResponse({ summary: 'Call (555) 123-4567 to discuss the quarterly review.' }),
    ),
  )
}

/** Hangs indefinitely, triggering the AbortController timeout in fetchInsights. */
export function aiInsightsTimeoutHandler() {
  return http.get(AI_INSIGHTS_URL, async () => {
    await delay('infinite')
    return HttpResponse.json(makeInsightsResponse())
  })
}

/** Returns a 429 with a retryAfter body so the rate-limit countdown is shown. */
export function aiInsightsRateLimitHandler(retryAfter = 32) {
  return http.get(AI_INSIGHTS_URL, () =>
    HttpResponse.json(
      { error: 'AI rate limit exceeded', retryAfter, message: `Retry in ${retryAfter}s.` },
      { status: 429 },
    ),
  )
}

/** Always returns 500 so both the first attempt and the single retry fail. */
export function aiInsightsServerErrorHandler() {
  return http.get(AI_INSIGHTS_URL, () =>
    HttpResponse.json({ error: 'Internal server error' }, { status: 500 }),
  )
}

type EmployeesVariables = {
  first?: number | null
  after?: string | null
  search?: string | null
  filter?: EmployeeFilter | null
}

type EmployeeRow = EmployeesQuery['employees']['edges'][number]['node']

// single-employee handler — used when the detail panel fetches on hard refresh (cache empty).
export function employeeDetailHandler(employeeRows: EmployeeRow[]) {
  return graphql.query<EmployeeQuery, EmployeeQueryVariables>('Employee', ({ variables }) => {
    const employee = employeeRows.find((e) => e.id === variables.id) ?? null
    return HttpResponse.json({ data: { __typename: 'Query' as const, employee } })
  })
}

// default success handlers. tests opt into other modes (error, empty, paged) via server.use(...).
export const handlers = [
  graphql.query<EmployeesQuery>('Employees', () => {
    return HttpResponse.json({ data: makeEmployeesResponse(employeeFixtures) })
  }),
  filterOptionsHandler(employeeFixtures),
  employeeDetailHandler(employeeFixtures),
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

// pageable handler whose cursor format matches the mock-server's btoa("cursor:<index>") encoding.
export function employeesPagedHandler(
  employeeRows: EmployeeRow[],
  options: { pageSize?: number } = {},
) {
  const pageSize = options.pageSize ?? 2
  const encodeCursor = (index: number) => btoa(`cursor:${index}`)
  return graphql.query<EmployeesQuery, EmployeesVariables>('Employees', ({ variables }) => {
    let startIndex = 0
    if (variables.after) {
      // decode base64 cursor: btoa("cursor:<lastIndexOfPriorPage>") → parse the index.
      const lastIndex = Number.parseInt(atob(variables.after).replace('cursor:', ''), 10)
      startIndex = Number.isNaN(lastIndex) ? 0 : lastIndex + 1
    }
    const pageRows = employeeRows.slice(startIndex, startIndex + pageSize)
    const lastIndex = startIndex + pageRows.length - 1
    const pageResponse: EmployeesQuery = {
      __typename: 'Query',
      employees: {
        __typename: 'EmployeeConnection',
        totalCount: employeeRows.length,
        edges: pageRows.map((employee, offset) => ({
          __typename: 'EmployeeEdge',
          cursor: encodeCursor(startIndex + offset),
          node: employee,
        })),
        pageInfo: {
          __typename: 'PageInfo',
          hasNextPage: lastIndex < employeeRows.length - 1,
          hasPreviousPage: startIndex > 0,
          startCursor: pageRows.length > 0 ? encodeCursor(startIndex) : null,
          endCursor: pageRows.length > 0 ? encodeCursor(lastIndex) : null,
        },
      },
    }
    return HttpResponse.json({ data: pageResponse })
  })
}
