/**
 * Chaos-mode integration tests for InsightsPanel.
 *
 * These tests let fetchInsights run against real MSW handlers so the full chain
 * (network → Zod validation → PII filter → hook state → UI) is exercised.
 * Only getAiConsentToken is mocked to skip the consent round-trip.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, waitFor, act } from '@testing-library/react'
import { server } from '@/test/mocks/server'
import {
  aiInsightsLowConfidenceHandler,
  aiInsightsPiiHandler,
  aiInsightsTimeoutHandler,
  aiInsightsRateLimitHandler,
  aiInsightsServerErrorHandler,
} from '@/test/mocks/handlers'
import { render } from '@/test/render'
import { InsightsPanel } from './InsightsPanel'

vi.mock('@/lib/ai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/ai')>()
  return {
    ...actual,
    getAiConsentToken: vi.fn(() => Promise.resolve('test-token')),
    hasValidAiConsentToken: vi.fn(() => true),
  }
})

vi.mock('@/lib/telemetry', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/telemetry')>()
  return { ...actual, emit: vi.fn() }
})

describe('InsightsPanel — chaos modes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('low-confidence: shows the low-confidence badge when confidence is at or below 0.3', async () => {
    server.use(aiInsightsLowConfidenceHandler())
    render(<InsightsPanel employeeId="emp_01" onAuthExpired={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText(/low confidence/i)).toBeInTheDocument()
    })
    expect(screen.getByText(/20%/)).toBeInTheDocument()
  })

  it('pii: redacts the phone number and shows the PII notice', async () => {
    server.use(aiInsightsPiiHandler())
    render(<InsightsPanel employeeId="emp_01" onAuthExpired={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText(/filtered for privacy/i)).toBeInTheDocument()
    })
    expect(screen.getByText(/\[REDACTED\]/)).toBeInTheDocument()
    expect(screen.queryByText(/555.*123.*4567/)).not.toBeInTheDocument()
  })

  it('timeout: shows timeout error with a retry button after 10s', async () => {
    vi.useFakeTimers()
    server.use(aiInsightsTimeoutHandler())
    render(<InsightsPanel employeeId="emp_01" onAuthExpired={vi.fn()} />)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_001)
    })

    expect(screen.getByText(/timed out/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
  })

  it('rate-limit: shows countdown with the retryAfter duration from the 429 body', async () => {
    server.use(aiInsightsRateLimitHandler(32))
    render(<InsightsPanel employeeId="emp_01" onAuthExpired={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText(/retrying in 32s/i)).toBeInTheDocument()
    })
  })

  it('server error: shows generic error with a retry button after both attempts fail', async () => {
    server.use(aiInsightsServerErrorHandler())
    render(<InsightsPanel employeeId="emp_01" onAuthExpired={vi.fn()} />)

    // fetcher retries once after RETRY_DELAY_MS (1s); allow 3s total
    await waitFor(
      () => {
        expect(screen.getByText(/failed to load insights/i)).toBeInTheDocument()
      },
      { timeout: 3000 },
    )
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
  })
})
