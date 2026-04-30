import type { EmployeesQuery } from '@/lib/apollo/generated'

type EmployeeNode = EmployeesQuery['employees']['edges'][number]['node']

export function makeEmployeeNode(overrides: Partial<EmployeeNode> = {}): EmployeeNode {
  return {
    __typename: 'Employee',
    id: 'emp_1',
    uid: 'uid_1',
    name: 'Ada Lovelace',
    photoUrl: null,
    trackingStatus: 'Included',
    teams: [{ __typename: 'Team', id: 'team_1', uid: 'platform', name: 'Platform' }],
    accounts: [
      { __typename: 'Account', type: 'vcs', source: 'GitHub', uid: 'gh_ada' },
      { __typename: 'Account', type: 'tms', source: 'Jira', uid: 'jira_ada' },
    ],
    ...overrides,
  }
}

export function makeEmployeesResponse(nodes: EmployeeNode[]): EmployeesQuery {
  return {
    __typename: 'Query',
    employees: {
      __typename: 'EmployeeConnection',
      totalCount: nodes.length,
      edges: nodes.map((node, index) => ({
        __typename: 'EmployeeEdge',
        cursor: `cursor_${index}`,
        node,
      })),
      pageInfo: {
        __typename: 'PageInfo',
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: nodes.length > 0 ? 'cursor_0' : null,
        endCursor: nodes.length > 0 ? `cursor_${nodes.length - 1}` : null,
      },
    },
  }
}

export const employeeFixtures: EmployeeNode[] = [
  makeEmployeeNode({ id: 'emp_1', uid: 'uid_1', name: 'Ada Lovelace' }),
  makeEmployeeNode({
    id: 'emp_2',
    uid: 'uid_2',
    name: 'Grace Hopper',
    trackingStatus: 'Ignored',
    teams: [{ __typename: 'Team', id: 'team_2', uid: 'compilers', name: 'Compilers' }],
    accounts: [{ __typename: 'Account', type: 'cal', source: 'Google Calendar', uid: 'cal_grace' }],
  }),
  makeEmployeeNode({
    id: 'emp_3',
    uid: 'uid_3',
    name: null,
    trackingStatus: null,
    teams: [],
    accounts: [],
  }),
]
