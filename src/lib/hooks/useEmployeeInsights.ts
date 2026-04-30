import { useState, useEffect } from 'react'
import {
  fetchInsights,
  filterPii,
  getAiConsentToken,
  InsightsFetchError,
  LOW_CONFIDENCE_THRESHOLD,
} from '@/lib/ai'
import type { AiInsightsResponse, InsightsErrorType } from '@/lib/ai'
import { emit, events } from '@/lib/telemetry'

// djb2-variant hash — identifies a specific AI response for feedback correlation
function computeResponseHash(text: string): string {
  let hash = 0
  for (const character of text) {
    hash = (Math.imul(31, hash) + character.charCodeAt(0)) | 0
  }
  return (hash >>> 0).toString(16)
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

/** Fetches, validates, and processes AI insights for an employee; handles PII and confidence. */
export function useEmployeeInsights(employeeId: string): UseEmployeeInsightsResult {
  const [insightsState, setInsightsState] = useState<InsightsState>({ status: 'loading' })
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    setInsightsState({ status: 'loading' })
    let isCancelled = false

    async function load(): Promise<void> {
      const startTime = Date.now()
      emit(events.aiInsightsRequested(employeeId))
      try {
        const token = await getAiConsentToken()
        const insight = await fetchInsights(employeeId, token)

        if (isCancelled) {
          return
        }

        const latencyMs = Date.now() - startTime
        const { text: summary, hasPii } = filterPii(insight.summary)
        const isLowConfidence = insight.confidence <= LOW_CONFIDENCE_THRESHOLD
        const responseHash = computeResponseHash(insight.summary)

        emit(events.aiInsightsSucceeded(employeeId, latencyMs, insight.confidence))
        if (isLowConfidence) {
          emit(events.aiInsightsLowConfidence(employeeId, insight.confidence))
        }
        if (hasPii) {
          emit(events.aiInsightsPiiFiltered(employeeId))
        }

        setInsightsState({
          status: 'success',
          insight,
          summary,
          hasPii,
          isLowConfidence,
          responseHash,
        })
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
    setRetryKey((key) => key + 1)
  }

  function handleInsightFeedback(rating: 'up' | 'down'): void {
    const responseHash = insightsState.status === 'success' ? insightsState.responseHash : ''
    emit(events.aiFeedbackSubmitted(employeeId, rating, responseHash))
  }

  return { insightsState, handleInsightRetry, handleInsightFeedback }
}
