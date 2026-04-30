import { describe, expect, it } from 'vitest'
import {
  LOW_CONFIDENCE_THRESHOLD,
  aiConsentResponseSchema,
  aiInsightsResponseSchema,
  rateLimitBodySchema,
} from './schemas'

const validInsightsResponse = {
  employeeId: 'emp_01',
  employeeUid: 'harry',
  summary: 'Harry Potter has been actively contributing.',
  confidence: 0.85,
  generatedAt: '2026-04-30T09:28:00.880Z',
  model: 'faros-insights-v1',
  processingTimeMs: 4093,
}

describe('aiInsightsResponseSchema', () => {
  it('parses a valid success response', () => {
    const result = aiInsightsResponseSchema.safeParse(validInsightsResponse)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual(validInsightsResponse)
    }
  })

  it('accepts confidence at the low-confidence boundary (0.3)', () => {
    const result = aiInsightsResponseSchema.safeParse({ ...validInsightsResponse, confidence: 0.3 })
    expect(result.success).toBe(true)
  })

  it('accepts confidence at the lower absolute boundary (0)', () => {
    const result = aiInsightsResponseSchema.safeParse({ ...validInsightsResponse, confidence: 0 })
    expect(result.success).toBe(true)
  })

  it('accepts confidence at the upper boundary (1)', () => {
    const result = aiInsightsResponseSchema.safeParse({ ...validInsightsResponse, confidence: 1 })
    expect(result.success).toBe(true)
  })

  it('rejects confidence below 0', () => {
    const result = aiInsightsResponseSchema.safeParse({
      ...validInsightsResponse,
      confidence: -0.01,
    })
    expect(result.success).toBe(false)
  })

  it('rejects confidence above 1', () => {
    const result = aiInsightsResponseSchema.safeParse({
      ...validInsightsResponse,
      confidence: 1.01,
    })
    expect(result.success).toBe(false)
  })

  it('rejects a missing required field', () => {
    const { summary: _summary, ...withoutSummary } = validInsightsResponse
    expect(aiInsightsResponseSchema.safeParse(withoutSummary).success).toBe(false)
  })

  it('strips unknown extra fields', () => {
    const result = aiInsightsResponseSchema.safeParse({
      ...validInsightsResponse,
      unknownField: 'extra',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect('unknownField' in result.data).toBe(false)
    }
  })

  it('rejects a non-number confidence', () => {
    const result = aiInsightsResponseSchema.safeParse({
      ...validInsightsResponse,
      confidence: 'high',
    })
    expect(result.success).toBe(false)
  })

  it('rejects null where a string is expected', () => {
    const result = aiInsightsResponseSchema.safeParse({ ...validInsightsResponse, summary: null })
    expect(result.success).toBe(false)
  })
})

describe('aiConsentResponseSchema', () => {
  it('parses a valid consent response', () => {
    const result = aiConsentResponseSchema.safeParse({
      consentToken: 'c8055299-53da-420c-9d5f-3bce46875058',
      expiresAt: '2026-04-30T10:27:40.290Z',
      scope: 'insights',
    })
    expect(result.success).toBe(true)
  })

  it('rejects a missing consentToken', () => {
    expect(
      aiConsentResponseSchema.safeParse({
        expiresAt: '2026-04-30T10:27:40.290Z',
        scope: 'insights',
      }).success,
    ).toBe(false)
  })

  it('rejects a missing expiresAt', () => {
    expect(
      aiConsentResponseSchema.safeParse({
        consentToken: 'some-token',
        scope: 'insights',
      }).success,
    ).toBe(false)
  })
})

describe('rateLimitBodySchema', () => {
  it('parses a valid 429 body', () => {
    const result = rateLimitBodySchema.safeParse({
      error: 'AI rate limit exceeded',
      retryAfter: 32,
      message: 'Retry in 32s.',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.retryAfter).toBe(32)
    }
  })

  it('fails when retryAfter is missing', () => {
    expect(rateLimitBodySchema.safeParse({ error: 'rate limit' }).success).toBe(false)
  })
})

describe('LOW_CONFIDENCE_THRESHOLD', () => {
  it('equals 0.3', () => {
    expect(LOW_CONFIDENCE_THRESHOLD).toBe(0.3)
  })
})
