import type { EmployeesQuery } from '@/lib/apollo/generated'

type EmployeeRow = EmployeesQuery['employees']['edges'][number]['node']

export function makeEmployeeRow(overrides: Partial<EmployeeRow> = {}): EmployeeRow {
  return {
    __typename: 'Employee',
    id: 'emp_1',
    uid: 'uid_1',
    name: 'Lando Calrissian',
    email: 'lando@acme.com',
    photoUrl: null,
    trackingStatus: 'Included',
    trackingCategory: 'Active',
    teams: [{ __typename: 'Team', id: 'team_1', uid: 'platform', name: 'Platform' }],
    accounts: [
      { __typename: 'Account', type: 'vcs', source: 'GitHub', uid: 'gh_lando' },
      { __typename: 'Account', type: 'tms', source: 'Jira', uid: 'jira_lando' },
    ],
    ...overrides,
  }
}

export function makeEmployeesResponse(employeeRows: EmployeeRow[]): EmployeesQuery {
  return {
    __typename: 'Query',
    employees: {
      __typename: 'EmployeeConnection',
      totalCount: employeeRows.length,
      edges: employeeRows.map((employee, index) => ({
        __typename: 'EmployeeEdge',
        cursor: `cursor_${index}`,
        node: employee,
      })),
      pageInfo: {
        __typename: 'PageInfo',
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: employeeRows.length > 0 ? 'cursor_0' : null,
        endCursor: employeeRows.length > 0 ? `cursor_${employeeRows.length - 1}` : null,
      },
    },
  }
}

// 10 employees so EMPLOYEES_PAGE_SIZE (5) gives exactly 2 pages — full first page, full last
// page — without making the multi-page-navigation test slow with extra clicks.
export const paginationFixtures: EmployeeRow[] = Array.from({ length: 10 }).map((_, index) =>
  makeEmployeeRow({
    id: `emp_${index + 1}`,
    uid: `uid_${index + 1}`,
    name: `Employee ${index + 1}`,
  }),
)

export const employeeFixtures: EmployeeRow[] = [
  makeEmployeeRow({ id: 'emp_1', uid: 'uid_1', name: 'Lando Calrissian' }),
  makeEmployeeRow({
    id: 'emp_2',
    uid: 'uid_2',
    name: 'Boba Fett',
    trackingStatus: 'Ignored',
    teams: [{ __typename: 'Team', id: 'team_2', uid: 'compilers', name: 'Compilers' }],
    accounts: [{ __typename: 'Account', type: 'cal', source: 'Google Calendar', uid: 'cal_boba' }],
  }),
  makeEmployeeRow({
    id: 'emp_3',
    uid: 'uid_3',
    name: null,
    trackingStatus: null,
    teams: [],
    accounts: [],
  }),
]
