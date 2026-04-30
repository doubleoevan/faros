import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Merges Tailwind class strings, deduping conflicting utilities. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

/** Returns first+last initials from a name; "?" when empty. Single names produce one letter. */
export function toInitials(name: string | null | undefined): string {
  if (!name) {
    return '?'
  }
  const nameParts = name
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
  if (nameParts.length === 0) {
    return '?'
  }
  const firstInitial = nameParts[0]?.[0] ?? ''
  const lastInitial = nameParts.length > 1 ? (nameParts.at(-1)?.[0] ?? '') : ''
  return (firstInitial + lastInitial).toUpperCase() || '?'
}

/** localeCompare for nullable strings; nulls and undefineds always sort to the end. */
export function compareNullableStrings(
  first: string | null | undefined,
  second: string | null | undefined,
  direction: 'asc' | 'desc',
): number {
  if (!first && !second) {
    return 0
  }
  if (!first) {
    return 1
  }
  if (!second) {
    return -1
  }
  const comparison = first.localeCompare(second)
  return direction === 'asc' ? comparison : -comparison
}
