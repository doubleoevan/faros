import type { AiInsightsResponse } from './schemas'

const INSIGHTS_CACHE_TTL_MS = 5 * 60 * 1_000

type CacheEntry = {
  insight: AiInsightsResponse
  cachedAt: number
}

const cache = new Map<string, CacheEntry>()
// deduplicates concurrent fetches for the same employee (prevents StrictMode double-fetch)
const pendingFetches = new Map<string, Promise<AiInsightsResponse>>()

/**
 * Returns the cached insight for an employee, or null if missing or expired.
 */
export function getCachedInsight(employeeId: string): AiInsightsResponse | null {
  const entry = cache.get(employeeId)
  if (!entry) {
    return null
  }
  if (Date.now() - entry.cachedAt > INSIGHTS_CACHE_TTL_MS) {
    cache.delete(employeeId)
    return null
  }
  return entry.insight
}

/**
 * Returns a resolved or in-flight promise for the employee's insight.
 * Calls factory() only when no cache entry and no pending fetch exist.
 * Caches the result on success so future calls avoid the network entirely.
 */
export function getOrFetchInsight(
  employeeId: string,
  factory: () => Promise<AiInsightsResponse>,
): Promise<AiInsightsResponse> {
  const cachedInsight = getCachedInsight(employeeId)
  if (cachedInsight) {
    return Promise.resolve(cachedInsight)
  }
  const pending = pendingFetches.get(employeeId)
  if (pending) {
    return pending
  }
  const promise = factory().then(
    (insight) => {
      cache.set(employeeId, { insight, cachedAt: Date.now() })
      pendingFetches.delete(employeeId)
      return insight
    },
    (error: unknown) => {
      pendingFetches.delete(employeeId)
      throw error
    },
  )
  pendingFetches.set(employeeId, promise)
  return promise
}

/**
 * Removes the cached insight and any pending fetch for a single employee; call before a manual retry.
 */
export function clearCachedInsight(employeeId: string): void {
  cache.delete(employeeId)
  pendingFetches.delete(employeeId)
}

/**
 * Clears all cached insights and pending fetches; call in test teardown to prevent cross-test state bleed.
 */
export function clearInsightsCache(): void {
  cache.clear()
  pendingFetches.clear()
}
