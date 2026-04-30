import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, vi } from 'vitest'
import { apolloClient } from '@/lib/apollo/client'
import { server } from './mocks/server'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(async () => {
  // unmount React trees (vitest's globals: false disables RTL auto-cleanup).
  cleanup()
  server.resetHandlers()
  // reset Apollo cache so cached data from a previous test doesn't bleed into the next.
  await apolloClient.clearStore()
  // drain any pending nuqs throttle timers (50 ms default) before resetting the URL.
  // useRealTimers first: fake-timer tests can't create real nuqs timers, so switching
  // back is safe and discards lingering fake timers rather than letting them contaminate
  // the next test's URL. without this drain a deferred flush from one test can fire
  // against the next test's URL.
  vi.useRealTimers()
  await new Promise((resolve) => setTimeout(resolve, 100))
  // reset the URL so nuqs-driven state (e.g., ?cursor=) doesn't leak between tests.
  // popstate notifies nuqs's internal store; replaceState alone is silent.
  window.history.replaceState(null, '', '/')
  window.dispatchEvent(new PopStateEvent('popstate'))
})
afterAll(() => server.close())
