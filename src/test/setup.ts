import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, vi } from 'vitest'
import { apolloClient } from '@/lib/apollo/client'
import { clearInsightsCache } from '@/lib/ai'
import { server } from './mocks/server'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(async () => {
  // unmount React trees (vitest's globals: false disables RTL auto-cleanup).
  cleanup()
  server.resetHandlers()
  // clear module-level AI insights cache so a successful test doesn't short-circuit the next.
  clearInsightsCache()
  // reset Apollo cache so cached data from a previous test doesn't bleed into the next.
  await apolloClient.clearStore()

  // drain pending nuqs throttle timers.
  // useRealTimers prevents a fake-timer flush from firing against the next test's URL.
  vi.useRealTimers()
  await new Promise((resolve) => setTimeout(resolve, 100))

  // reset the URL so nuqs-driven state (e.g., ?cursor=) doesn't leak between tests.
  // popstate notifies nuqs's internal store; replaceState alone is silent.
  window.history.replaceState(null, '', '/')
  window.dispatchEvent(new PopStateEvent('popstate'))
})
afterAll(() => server.close())
