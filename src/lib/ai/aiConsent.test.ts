import { beforeEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/mocks/server'
import { clearAiConsentToken, getAiConsentToken } from './aiConsent'

const AI_CONSENT_URL = 'http://localhost:4000/api/ai/consent'

function makeConsentBody(expiresInMs = 60 * 60 * 1000) {
  return {
    consentToken: 'test-consent-token',
    expiresAt: new Date(Date.now() + expiresInMs).toISOString(),
    scope: 'insights',
  }
}

describe('getAiConsentToken', () => {
  beforeEach(() => {
    clearAiConsentToken()
  })

  it('posts to /api/ai/consent and returns the token', async () => {
    server.use(http.post(AI_CONSENT_URL, () => HttpResponse.json(makeConsentBody())))

    const token = await getAiConsentToken()
    expect(token).toBe('test-consent-token')
  })

  it('returns the cached token on a second call without re-fetching', async () => {
    let requestCount = 0
    server.use(
      http.post(AI_CONSENT_URL, () => {
        requestCount++
        return HttpResponse.json(makeConsentBody())
      }),
    )

    await getAiConsentToken()
    await getAiConsentToken()
    expect(requestCount).toBe(1)
  })

  it('re-fetches when the cached token is already expired', async () => {
    let requestCount = 0
    server.use(
      http.post(AI_CONSENT_URL, () => {
        requestCount++
        // expiresAt in the past → isTokenFresh returns false immediately
        return HttpResponse.json(makeConsentBody(-1000))
      }),
    )

    await getAiConsentToken()
    await getAiConsentToken()
    expect(requestCount).toBe(2)
  })

  it('throws when the consent endpoint returns a non-2xx status', async () => {
    server.use(
      http.post(AI_CONSENT_URL, () =>
        HttpResponse.json({ error: 'Bad request', message: 'userId required.' }, { status: 400 }),
      ),
    )

    await expect(getAiConsentToken()).rejects.toThrow('Consent request failed with status 400')
  })

  it('throws when the response body fails Zod validation', async () => {
    server.use(http.post(AI_CONSENT_URL, () => HttpResponse.json({ notAToken: true })))

    await expect(getAiConsentToken()).rejects.toThrow('Consent response validation failed')
  })
})

describe('clearAiConsentToken', () => {
  beforeEach(() => {
    clearAiConsentToken()
  })

  it('clears the cache so the next call re-fetches', async () => {
    let requestCount = 0
    server.use(
      http.post(AI_CONSENT_URL, () => {
        requestCount++
        return HttpResponse.json(makeConsentBody())
      }),
    )

    await getAiConsentToken()
    clearAiConsentToken()
    await getAiConsentToken()
    expect(requestCount).toBe(2)
  })
})
