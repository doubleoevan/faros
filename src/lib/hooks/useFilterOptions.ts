import { useQuery } from '@apollo/client'
import { FilterOptionsDocument } from '@/lib/apollo/generated'

/**
 * Typed Apollo `useQuery` for filter dropdown values (teams, statuses, account types).
 */
export function useFilterOptions() {
  return useQuery(FilterOptionsDocument)
}
