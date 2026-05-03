import { assertNever } from '@/lib/utils'

export type SortDirection = 'asc' | 'desc' | null

/**
 * Reads the sort URL value (`name` / `-name`) and returns asc/desc/null for a given field.
 */
export function sortDirectionForField(currentSort: string | null, field: string): SortDirection {
  if (currentSort === field) {
    return 'asc'
  }
  if (currentSort === `-${field}`) {
    return 'desc'
  }
  return null
}

/**
 * Returns the next sort URL value when a header is clicked: null → asc → desc → null.
 */
export function nextSortValue(currentSort: string | null, field: string): string | null {
  const direction = sortDirectionForField(currentSort, field)
  if (direction === null) {
    return field
  }
  if (direction === 'asc') {
    return `-${field}`
  }
  if (direction === 'desc') {
    return null
  }
  return assertNever(direction)
}
