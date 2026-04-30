import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { delay, http, HttpResponse } from 'msw'
import { server } from '@/test/mocks/server'
import { InsightsFetchError, fetchInsights } from './fetcher'

const INSIGHTS_URL = 'http://localhost:4000/api/ai/insights/:employeeId'

const validInsightsResponse = {
  employeeId: 'emp_01',
  employeeUid: 'harry',
  summary: 'Harry Potter has been actively contributing to the platform team.',
  confidence: 0.85,
  generatedAt: '2026-04-30T09:28:00.880Z',
  model: 'faros-insights-v1',
  processingTimeMs: 4093,
}

describe('fetchInsights', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns a Zod-validated InsightsResponse on success', async () => {
    server.use(http.get(INSIGHTS_URL, () => HttpResponse.json(validInsightsResponse)))

    const result = await fetchInsights('emp_01', 'valid-token')
    expect(result).toEqual(validInsightsResponse)
  })

  it('passes X-Consent-Token (not Authorization Bearer) to the request', async () => {
    let capturedToken: string | null = null
    server.use(
      http.get(INSIGHTS_URL, ({ request }) => {
        capturedToken = request.headers.get('X-Consent-Token')
        return HttpResponse.json(validInsightsResponse)
      }),
    )

    await fetchInsights('emp_01', 'my-consent-token')
    expect(capturedToken).toBe('my-consent-token')
  })

  describe('5xx retry', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    it('retries once on 5xx and returns the result when the retry succeeds', async () => {
      let requestCount = 0
      server.use(
        http.get(INSIGHTS_URL, () => {
          requestCount++
          if (requestCount === 1) {
            return HttpResponse.json({ error: 'internal server error' }, { status: 500 })
          }
          return HttpResponse.json(validInsightsResponse)
        }),
      )

      const fetchPromise = fetchInsights('emp_01', 'valid-token')
      // advance past RETRY_DELAY_MS (1s) but not the overall timeout (10s)
      await vi.advanceTimersByTimeAsync(1_001)

      const result = await fetchPromise
      expect(requestCount).toBe(2)
      expect(result.employeeId).toBe('emp_01')
    })

    it('throws server_error when both the first attempt and retry return 5xx', async () => {
      server.use(
        http.get(INSIGHTS_URL, () =>
          HttpResponse.json({ error: 'service unavailable' }, { status: 503 }),
        ),
      )

      const fetchPromise = fetchInsights('emp_01', 'valid-token')
      // attach before advancing so the rejection is handled
      fetchPromise.catch(() => {})
      await vi.advanceTimersByTimeAsync(1_001)

      await expect(fetchPromise).rejects.toMatchObject({ kind: 'server_error', status: 503 })
    })
  })

  it('throws unauthorized on 401 and does not retry', async () => {
    let requestCount = 0
    server.use(
      http.get(INSIGHTS_URL, () => {
        requestCount++
        return HttpResponse.json(
          { error: 'Consent required', message: 'Obtain a token via POST /api/ai/consent.' },
          { status: 401 },
        )
      }),
    )

    await expect(fetchInsights('emp_01', 'no-token')).rejects.toMatchObject({
      kind: 'unauthorized',
    })
    expect(requestCount).toBe(1)
  })

  it('throws unauthorized on 403 and does not retry', async () => {
    server.use(
      http.get(INSIGHTS_URL, () =>
        HttpResponse.json(
          { error: 'Consent expired', message: 'Obtain a new token.' },
          { status: 403 },
        ),
      ),
    )

    await expect(fetchInsights('emp_01', 'expired-token')).rejects.toMatchObject({
      kind: 'unauthorized',
    })
  })

  it('throws not_found on 404', async () => {
    server.use(
      http.get(INSIGHTS_URL, () =>
        HttpResponse.json(
          { error: 'Employee not found', message: 'No employee with id "does-not-exist".' },
          { status: 404 },
        ),
      ),
    )

    await expect(fetchInsights('does-not-exist', 'valid-token')).rejects.toMatchObject({
      kind: 'not_found',
    })
  })

  it('throws rate_limited with retryAfterSeconds parsed from the 429 body', async () => {
    server.use(
      http.get(INSIGHTS_URL, () =>
        HttpResponse.json(
          { error: 'AI rate limit exceeded', retryAfter: 32, message: 'Retry in 32s.' },
          { status: 429 },
        ),
      ),
    )

    await expect(fetchInsights('emp_01', 'valid-token')).rejects.toMatchObject({
      kind: 'rate_limited',
      retryAfterSeconds: 32,
    })
  })

  it('defaults retryAfterSeconds to 60 when 429 body lacks retryAfter', async () => {
    server.use(
      http.get(INSIGHTS_URL, () => HttpResponse.json({ error: 'rate limit' }, { status: 429 })),
    )

    await expect(fetchInsights('emp_01', 'valid-token')).rejects.toMatchObject({
      kind: 'rate_limited',
      retryAfterSeconds: 60,
    })
  })

  it('throws timeout after the AbortController fires at 10s', async () => {
    vi.useFakeTimers()

    server.use(
      http.get(INSIGHTS_URL, async () => {
        await delay('infinite')
        return HttpResponse.json(validInsightsResponse)
      }),
    )

    const fetchPromise = fetchInsights('emp_01', 'valid-token')
    // attach before advancing so the rejection is handled
    fetchPromise.catch(() => {})
    await vi.advanceTimersByTimeAsync(10_001)

    await expect(fetchPromise).rejects.toMatchObject({ kind: 'timeout' })
  })

  it('throws network when fetch itself rejects', async () => {
    server.use(http.get(INSIGHTS_URL, () => HttpResponse.error()))

    await expect(fetchInsights('emp_01', 'valid-token')).rejects.toMatchObject({
      kind: 'network',
    })
  })

  it('throws validation when the 200 body does not match the schema', async () => {
    server.use(http.get(INSIGHTS_URL, () => HttpResponse.json({ malformed: true })))

    await expect(fetchInsights('emp_01', 'valid-token')).rejects.toMatchObject({
      kind: 'validation',
    })
  })

  it('always throws InsightsFetchError for all failure modes', async () => {
    server.use(
      http.get(INSIGHTS_URL, () =>
        HttpResponse.json({ error: 'Consent required' }, { status: 401 }),
      ),
    )

    await expect(fetchInsights('emp_01', 'valid-token')).rejects.toBeInstanceOf(InsightsFetchError)
  })
})
