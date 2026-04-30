import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { apolloClient } from '@/lib/apollo/client'
import { server } from './mocks/server'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(async () => {
  // unmount React trees (vitest's globals: false disables RTL auto-cleanup).
  cleanup()
  server.resetHandlers()
  // reset Apollo cache so cached data from a previous test doesn't bleed into the next.
  await apolloClient.clearStore()
  // reset the URL so nuqs-driven state (e.g., ?cursor=) doesn't leak between tests.
  window.history.replaceState(null, '', '/')
})
afterAll(() => server.close())
