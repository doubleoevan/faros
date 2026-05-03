/**
 * Branded type for Employee.id sourced from the GraphQL API.
 */
export type EmployeeId = string & { readonly _brand: 'EmployeeId' }
