import '@testing-library/jest-dom/vitest'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { apolloClient } from '@/lib/apollo/client'
import { server } from './mocks/server'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(async () => {
  server.resetHandlers()
  // reset Apollo cache so cached data from a previous test doesn't bleed into the next.
  await apolloClient.clearStore()
})
afterAll(() => server.close())
