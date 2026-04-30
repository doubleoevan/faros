import { aiInsightsResponseSchema, rateLimitBodySchema, type AiInsightsResponse } from './schemas'

const graphqlUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/graphql'
const AI_BASE_URL = new URL(graphqlUrl).origin
const TIMEOUT_MS = 10_000
const RETRY_DELAY_MS = 1_000

export type InsightsErrorType =
  | 'timeout'
  | 'rate_limited'
  | 'unauthorized'
  | 'not_found'
  | 'server_error'
  | 'network'
  | 'validation'

/** Structured error thrown by fetchInsights; inspect `.type` for telemetry routing. */
export class InsightsFetchError extends Error {
  readonly type: InsightsErrorType
  readonly retryAfterSeconds?: number
  readonly status?: number

  constructor(
    message: string,
    type: InsightsErrorType,
    extras?: { retryAfterSeconds?: number; status?: number },
  ) {
    super(message)
    this.name = 'InsightsFetchError'
    this.type = type
    this.retryAfterSeconds = extras?.retryAfterSeconds
    this.status = extras?.status
  }
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

async function doFetch(
  employeeId: string,
  consentToken: string,
  signal: AbortSignal,
): Promise<Response> {
  return fetch(`${AI_BASE_URL}/api/ai/insights/${encodeURIComponent(employeeId)}`, {
    headers: { 'X-Consent-Token': consentToken },
    signal,
  })
}

async function tryFetch(
  employeeId: string,
  consentToken: string,
  controller: AbortController,
): Promise<Response> {
  try {
    return await doFetch(employeeId, consentToken, controller.signal)
  } catch (fetchError: unknown) {
    if (controller.signal.aborted) {
      throw new InsightsFetchError('Request timed out after 10s', 'timeout')
    }
    const message = fetchError instanceof Error ? fetchError.message : 'Network error'
    throw new InsightsFetchError(message, 'network')
  }
}

async function parseResponse(response: Response): Promise<AiInsightsResponse> {
  if (response.status === 401 || response.status === 403) {
    throw new InsightsFetchError('Consent required or token expired', 'unauthorized')
  }
  if (response.status === 404) {
    throw new InsightsFetchError('Employee not found', 'not_found')
  }
  if (response.status === 429) {
    const body: unknown = await response.json().catch(() => ({}))
    const parsed = rateLimitBodySchema.safeParse(body)
    const retryAfterSeconds = parsed.success ? parsed.data.retryAfter : 60
    throw new InsightsFetchError('Rate limit exceeded', 'rate_limited', { retryAfterSeconds })
  }
  if (!response.ok) {
    throw new InsightsFetchError(`Server error: ${response.status}`, 'server_error', {
      status: response.status,
    })
  }

  const data: unknown = await response.json()
  const result = aiInsightsResponseSchema.safeParse(data)
  if (!result.success) {
    throw new InsightsFetchError(`Validation failed: ${result.error.message}`, 'validation')
  }

  return result.data
}

/** Fetches AI-generated insights for an employee; retries once on 5xx, aborts after 10s. */
export async function fetchInsights(
  employeeId: string,
  consentToken: string,
): Promise<AiInsightsResponse> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const firstResponse = await tryFetch(employeeId, consentToken, controller)

    // retry once on 5xx — chaos.js does not apply to AI routes, but defensive against real infra errors
    if (firstResponse.status >= 500) {
      await sleep(RETRY_DELAY_MS)
      const retryResponse = await tryFetch(employeeId, consentToken, controller)
      return parseResponse(retryResponse)
    }

    return parseResponse(firstResponse)
  } finally {
    clearTimeout(timeoutId)
  }
}
