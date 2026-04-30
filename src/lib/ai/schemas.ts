import { z } from 'zod'

/**
 * Confidence scores at or below this threshold are flagged as low-confidence.
 */
export const LOW_CONFIDENCE_THRESHOLD = 0.3

/**
 * Zod schema for the POST /api/ai/consent success response.
 */
export const aiConsentResponseSchema = z.object({
  consentToken: z.string(),
  expiresAt: z.string(),
  scope: z.string(),
})

/**
 * Zod schema for the GET /api/ai/insights/:employeeId success response.
 */
export const aiInsightsResponseSchema = z.object({
  employeeId: z.string(),
  employeeUid: z.string(),
  summary: z.string(),
  confidence: z.number().min(0).max(1),
  generatedAt: z.string(),
  model: z.string(),
  processingTimeMs: z.number(),
})

/**
 * Parses 429 response bodies for `retryAfter`. Other fields are ignored.
 */
export const rateLimitBodySchema = z.object({
  retryAfter: z.number(),
})

export type AiConsentResponse = z.infer<typeof aiConsentResponseSchema>
export type AiInsightsResponse = z.infer<typeof aiInsightsResponseSchema>
