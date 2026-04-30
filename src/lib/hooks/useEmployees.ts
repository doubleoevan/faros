import { useQuery } from '@apollo/client'
import { EmployeesDocument, type EmployeesQueryVariables } from '@/lib/apollo/generated'

/**
 * Typed Apollo `useQuery` for the Employees list, with network-status updates enabled.
 */
export function useEmployees(variables?: EmployeesQueryVariables) {
  return useQuery(EmployeesDocument, { variables, notifyOnNetworkStatusChange: true })
}
