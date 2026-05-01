import { useState, useEffect } from 'react'
import {
  fetchInsights,
  filterPii,
  getAiConsentToken,
  getCachedInsight,
  getOrFetchInsight,
  clearCachedInsight,
  InsightsFetchError,
  LOW_CONFIDENCE_THRESHOLD,
} from '@/lib/ai'
import type { AiInsightsResponse, InsightsErrorType } from '@/lib/ai'
import { emit, events } from '@/lib/telemetry'

// djb2-variant hash to identify a specific AI response for feedback correlation
function computeResponseHash(text: string): string {
  let hash = 0
  for (const character of text) {
    hash = (Math.imul(31, hash) + character.charCodeAt(0)) | 0
  }
  return (hash >>> 0).toString(16)
}

function processInsight(insight: AiInsightsResponse) {
  const { text: summary, hasPii } = filterPii(insight.summary)
  const isLowConfidence = insight.confidence <= LOW_CONFIDENCE_THRESHOLD
  const responseHash = computeResponseHash(insight.summary)
  return { summary, hasPii, isLowConfidence, responseHash }
}

type InsightsState =
  | { status: 'loading' }
  | {
      status: 'success'
      insight: AiInsightsResponse
      summary: string
      hasPii: boolean
      isLowConfidence: boolean
      responseHash: string
    }
  | {
      status: 'error'
      type: InsightsErrorType
      retryAfterSeconds?: number
    }

export type UseEmployeeInsightsResult = {
  insightsState: InsightsState
  handleInsightRetry: () => void
  handleInsightFeedback: (rating: 'up' | 'down') => void
}

/**
 * Fetches, validates, and processes AI insights for an employee; handles PII and confidence.
 */
export function useEmployeeInsights(employeeId: string): UseEmployeeInsightsResult {
  const [insightsState, setInsightsState] = useState<InsightsState>({ status: 'loading' })
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    let isCancelled = false

    emit(events.aiInsightsRequested(employeeId))

    // serve from cache if available to avoid a loading flash and unnecessary network call
    const cachedInsight = getCachedInsight(employeeId)
    if (cachedInsight) {
      const processed = processInsight(cachedInsight)
      emit(events.aiInsightsSucceeded(employeeId, 0, cachedInsight.confidence))
      if (processed.isLowConfidence) {
        emit(events.aiInsightsLowConfidence(employeeId, cachedInsight.confidence))
      }
      if (processed.hasPii) {
        emit(events.aiInsightsPiiFiltered(employeeId))
      }
      setInsightsState({ status: 'success', insight: cachedInsight, ...processed })
      return
    }

    setInsightsState({ status: 'loading' })

    // call getOrFetchInsight synchronously (before any await) so that StrictMode's
    // second effect invocation finds the pending promise in the map and reuses it
    // instead of starting a duplicate network request.
    const startTime = Date.now()
    const insightPromise = getOrFetchInsight(employeeId, async () => {
      const token = await getAiConsentToken()
      return fetchInsights(employeeId, token)
    })

    async function load(): Promise<void> {
      try {
        const insight = await insightPromise

        if (isCancelled) {
          return
        }
        const latencyMs = Date.now() - startTime
        const processed = processInsight(insight)

        emit(events.aiInsightsSucceeded(employeeId, latencyMs, insight.confidence))
        if (processed.isLowConfidence) {
          emit(events.aiInsightsLowConfidence(employeeId, insight.confidence))
        }
        if (processed.hasPii) {
          emit(events.aiInsightsPiiFiltered(employeeId))
        }

        setInsightsState({ status: 'success', insight, ...processed })
      } catch (error) {
        if (isCancelled) {
          return
        }
        if (error instanceof InsightsFetchError) {
          if (error.type === 'timeout') {
            emit(events.aiInsightsTimeout(employeeId))
          } else if (error.type === 'rate_limited') {
            emit(events.aiInsightsRateLimited(employeeId, error.retryAfterSeconds ?? 60))
          } else {
            emit(events.aiInsightsFailed(employeeId, error.type))
          }
          setInsightsState({
            status: 'error',
            type: error.type,
            retryAfterSeconds: error.retryAfterSeconds,
          })
        } else {
          emit(events.aiInsightsFailed(employeeId, 'network'))
          setInsightsState({ status: 'error', type: 'network' })
        }
      }
    }

    void load()

    return () => {
      isCancelled = true
    }
  }, [employeeId, retryKey])

  function handleInsightRetry(): void {
    clearCachedInsight(employeeId)
    setRetryKey((key) => key + 1)
  }

  function handleInsightFeedback(rating: 'up' | 'down'): void {
    const responseHash = insightsState.status === 'success' ? insightsState.responseHash : ''
    emit(events.aiFeedbackSubmitted(employeeId, rating, responseHash))
  }

  return { insightsState, handleInsightRetry, handleInsightFeedback }
}
