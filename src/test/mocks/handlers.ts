import { graphql, HttpResponse } from 'msw'
import type { EmployeesQuery } from '@/lib/apollo/generated'
import { employeeFixtures, makeEmployeesResponse } from './fixtures'

// default success handler. tests opt into other modes (error, empty) via server.use(...).
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
