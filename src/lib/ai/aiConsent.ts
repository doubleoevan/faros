import { getSessionId } from '@/lib/telemetry'
import { aiConsentResponseSchema } from './schemas'

/**
 * Branded type for a consent token issued by POST /api/ai/consent.
 */
export type ConsentToken = string & { readonly _brand: 'ConsentToken' }

const graphqlUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/graphql'
const AI_BASE_URL = new URL(graphqlUrl).origin

type CachedToken = {
  token: ConsentToken
  expiresAt: Date
}

let cachedToken: CachedToken | null = null

// re-fetch 5 minutes before the server-issued expiry to prevent edge-case failures
const EXPIRY_BUFFER_MS = 5 * 60 * 1000

function isTokenFresh(cached: CachedToken): boolean {
  return cached.expiresAt.getTime() - Date.now() > EXPIRY_BUFFER_MS
}

/**
 * Fetches and caches a consent token; returns the cached token if it is still valid.
 */
export async function getAiConsentToken(): Promise<ConsentToken> {
  if (cachedToken !== null && isTokenFresh(cachedToken)) {
    return cachedToken.token
  }

  const response = await fetch(`${AI_BASE_URL}/api/ai/consent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: getSessionId(), scope: 'insights' }),
  })

  if (!response.ok) {
    throw new Error(`Consent request failed with status ${response.status}`)
  }

  const data: unknown = await response.json()
  const result = aiConsentResponseSchema.safeParse(data)
  if (!result.success) {
    throw new Error(`Consent response validation failed: ${result.error.message}`)
  }

  cachedToken = {
    token: result.data.consentToken as ConsentToken,
    expiresAt: new Date(result.data.expiresAt),
  }

  return cachedToken.token
}

/**
 * Returns true if a valid consent token is already cached; does not fetch a new one.
 */
export function hasValidAiConsentToken(): boolean {
  return cachedToken !== null && isTokenFresh(cachedToken)
}

/**
 * Clears the in-memory consent token, triggering a fresh fetch on the next call.
 */
export function clearAiConsentToken(): void {
  cachedToken = null
}
