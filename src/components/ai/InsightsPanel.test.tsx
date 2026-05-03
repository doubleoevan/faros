import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@/test/render'
import { InsightsFetchError } from '@/lib/ai/fetcher'
import { InsightsPanel } from './InsightsPanel'

vi.mock('@/lib/ai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/ai')>()
  return {
    ...actual,
    hasValidAiConsentToken: vi.fn(() => true),
    getAiConsentToken: vi.fn(() => Promise.resolve('test-token')),
    fetchInsights: vi.fn(),
  }
})

vi.mock('@/lib/telemetry', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/telemetry')>()
  return { ...actual, emit: vi.fn() }
})

import { fetchInsights } from '@/lib/ai'
import { emit } from '@/lib/telemetry'

const validInsight = {
  employeeId: 'emp_01',
  employeeUid: 'harry',
  summary: 'Harry Potter has been actively contributing to the platform team.',
  confidence: 0.85,
  generatedAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
  model: 'faros-insights-v1',
  processingTimeMs: 1200,
}

describe('InsightsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows a loading skeleton while fetching', () => {
    vi.mocked(fetchInsights).mockReturnValue(new Promise(() => {}))
    render(<InsightsPanel employeeId="emp_01" onAuthExpired={vi.fn()} />)
    expect(screen.getByRole('region', { name: /ai insights/i })).toHaveAttribute(
      'aria-busy',
      'true',
    )
  })

  it('renders the summary on success', async () => {
    vi.mocked(fetchInsights).mockResolvedValue(validInsight)
    render(<InsightsPanel employeeId="emp_01" onAuthExpired={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByText(/harry potter has been actively/i)).toBeInTheDocument()
    })
  })

  it('emits aiInsightsSucceeded on success', async () => {
    vi.mocked(fetchInsights).mockResolvedValue(validInsight)
    render(<InsightsPanel employeeId="emp_01" onAuthExpired={vi.fn()} />)
    await waitFor(() => {
      expect(
        vi.mocked(emit).mock.calls.some((call) => call[0].name === 'ai.insights.succeeded'),
      ).toBe(true)
    })
  })

  it('shows a low-confidence badge when confidence is at or below the threshold', async () => {
    vi.mocked(fetchInsights).mockResolvedValue({ ...validInsight, confidence: 0.3 })
    render(<InsightsPanel employeeId="emp_01" onAuthExpired={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByText(/low confidence/i)).toBeInTheDocument()
    })
    expect(
      vi.mocked(emit).mock.calls.some((call) => call[0].name === 'ai.insights.low_confidence'),
    ).toBe(true)
  })

  it('does not show the low-confidence badge for normal confidence', async () => {
    vi.mocked(fetchInsights).mockResolvedValue(validInsight)
    render(<InsightsPanel employeeId="emp_01" onAuthExpired={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByText(/harry potter/i)).toBeInTheDocument()
    })
    expect(screen.queryByText(/low confidence/i)).not.toBeInTheDocument()
  })

  it('shows the PII notice and redacts content when the summary contains PII', async () => {
    vi.mocked(fetchInsights).mockResolvedValue({
      ...validInsight,
      summary: 'Contact via (555) 123-4567.',
    })
    render(<InsightsPanel employeeId="emp_01" onAuthExpired={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByText(/filtered for privacy/i)).toBeInTheDocument()
    })
    expect(screen.getByText(/\[REDACTED\]/)).toBeInTheDocument()
    expect(screen.queryByText(/555.*123.*4567/)).not.toBeInTheDocument()
  })

  it('emits aiInsightsPiiFiltered when PII is detected', async () => {
    vi.mocked(fetchInsights).mockResolvedValue({
      ...validInsight,
      summary: 'Email: test@example.com.',
    })
    render(<InsightsPanel employeeId="emp_01" onAuthExpired={vi.fn()} />)
    await waitFor(() => {
      expect(
        vi.mocked(emit).mock.calls.some((call) => call[0].name === 'ai.insights.pii_filtered'),
      ).toBe(true)
    })
  })

  it('shows a timeout error message with a retry button', async () => {
    vi.mocked(fetchInsights).mockRejectedValue(new InsightsFetchError('timed out', 'timeout'))
    render(<InsightsPanel employeeId="emp_01" onAuthExpired={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByText(/timed out/i)).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
  })

  it('shows a rate-limited countdown with the initial wait duration', async () => {
    vi.mocked(fetchInsights).mockRejectedValueOnce(
      new InsightsFetchError('rate limited', 'rate_limited', { retryAfterSeconds: 32 }),
    )
    render(<InsightsPanel employeeId="emp_01" onAuthExpired={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByText(/retrying in 32s/i)).toBeInTheDocument()
    })
  })

  it('counts down each second and auto-retries when the countdown reaches zero', async () => {
    vi.mocked(fetchInsights).mockReset()
    vi.mocked(fetchInsights)
      .mockRejectedValueOnce(
        new InsightsFetchError('rate limited', 'rate_limited', { retryAfterSeconds: 1 }),
      )
      .mockResolvedValueOnce(validInsight)

    render(<InsightsPanel employeeId="emp_01" onAuthExpired={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText(/retrying in 1s/i)).toBeInTheDocument()
    })

    // countdown expires after 1s; auto-retry resolves with the valid insight
    await waitFor(
      () => {
        expect(screen.getByText(/harry potter/i)).toBeInTheDocument()
      },
      { timeout: 3000 },
    )
  })

  it('shows a re-authorize button on unauthorized error and calls onAuthExpired on click', async () => {
    const handleAuthExpired = vi.fn()
    vi.mocked(fetchInsights).mockRejectedValue(
      new InsightsFetchError('unauthorized', 'unauthorized'),
    )
    render(<InsightsPanel employeeId="emp_01" onAuthExpired={handleAuthExpired} />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /re-authorize/i })).toBeInTheDocument()
    })
    await userEvent.click(screen.getByRole('button', { name: /re-authorize/i }))
    expect(handleAuthExpired).toHaveBeenCalledTimes(1)
  })

  it('submitting helpful feedback emits aiFeedbackSubmitted with rating up', async () => {
    vi.mocked(fetchInsights).mockResolvedValue(validInsight)
    render(<InsightsPanel employeeId="emp_01" onAuthExpired={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Helpful' })).toBeInTheDocument()
    })
    await userEvent.click(screen.getByRole('button', { name: 'Helpful' }))
    const feedbackCall = vi
      .mocked(emit)
      .mock.calls.find((call) => call[0].name === 'ai.feedback.submitted')
    expect(feedbackCall).toBeDefined()
    expect(feedbackCall?.[0].properties?.rating).toBe('up')
    expect(typeof feedbackCall?.[0].properties?.confidence).toBe('number')
    expect(typeof feedbackCall?.[0].properties?.model).toBe('string')
  })

  it('shows thank-you confirmation after feedback is submitted', async () => {
    vi.mocked(fetchInsights).mockResolvedValue(validInsight)
    render(<InsightsPanel employeeId="emp_01" onAuthExpired={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Not helpful' })).toBeInTheDocument()
    })
    await userEvent.click(screen.getByRole('button', { name: 'Not helpful' }))
    expect(screen.getByText(/thanks for your feedback/i)).toBeInTheDocument()
  })

  it('serves a returning employee from cache without a second network call', async () => {
    const emp02Insight = {
      ...validInsight,
      employeeId: 'emp_02',
      employeeUid: 'ron',
      summary: 'Ron Weasley has been contributing to the backend.',
    }
    vi.mocked(fetchInsights).mockImplementation((id) =>
      Promise.resolve(id === 'emp_02' ? emp02Insight : validInsight),
    )

    const { rerender } = render(<InsightsPanel employeeId="emp_01" onAuthExpired={vi.fn()} />)
    await waitFor(() => expect(screen.getByText(/harry potter/i)).toBeInTheDocument())
    expect(vi.mocked(fetchInsights)).toHaveBeenCalledTimes(1)

    rerender(<InsightsPanel employeeId="emp_02" onAuthExpired={vi.fn()} />)
    await waitFor(() => expect(screen.getByText(/ron weasley/i)).toBeInTheDocument())
    expect(vi.mocked(fetchInsights)).toHaveBeenCalledTimes(2)

    rerender(<InsightsPanel employeeId="emp_01" onAuthExpired={vi.fn()} />)
    await waitFor(() => expect(screen.getByText(/harry potter/i)).toBeInTheDocument())
    // emp_01 served from cache — fetch count must not increase
    expect(vi.mocked(fetchInsights)).toHaveBeenCalledTimes(2)
  })
})
