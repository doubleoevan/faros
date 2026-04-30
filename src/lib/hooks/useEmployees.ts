import { useQuery } from '@apollo/client'
import { EmployeesDocument, type EmployeesQueryVariables } from '@/lib/apollo/generated'

export function useEmployees(variables?: EmployeesQueryVariables) {
  return useQuery(EmployeesDocument, { variables, notifyOnNetworkStatusChange: true })
}
