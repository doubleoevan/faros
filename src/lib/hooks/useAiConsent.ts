import { useState, useEffect, useRef } from 'react'
import { getAiConsentToken, hasValidAiConsentToken, clearAiConsentToken } from '@/lib/ai'
import { emit, events } from '@/lib/telemetry'

export type AiConsentStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'error'

export type UseAiConsentResult = {
  consentStatus: AiConsentStatus
  handleGrantConsent: () => Promise<void>
  handleDenyConsent: () => void
  handleResetConsent: () => void
}

/**
 * Manages the AI consent state machine: prompt visibility, token retrieval, and telemetry.
 */
export function useAiConsent(): UseAiConsentResult {
  const [consentStatus, setConsentStatus] = useState<AiConsentStatus>(() =>
    hasValidAiConsentToken() ? 'granted' : 'idle',
  )
  const hasEmittedRequestRef = useRef(false)

  useEffect(() => {
    if (consentStatus === 'idle' && !hasEmittedRequestRef.current) {
      hasEmittedRequestRef.current = true
      emit(events.aiConsentRequested())
    }
  }, [consentStatus])

  async function handleGrantConsent(): Promise<void> {
    setConsentStatus('requesting')
    try {
      await getAiConsentToken()
      setConsentStatus('granted')
      emit(events.aiConsentGranted())
    } catch {
      setConsentStatus('error')
    }
  }

  function handleDenyConsent(): void {
    setConsentStatus('denied')
    emit(events.aiConsentDenied())
  }

  function handleResetConsent(): void {
    clearAiConsentToken()
    hasEmittedRequestRef.current = false
    setConsentStatus('idle')
  }

  return { consentStatus, handleGrantConsent, handleDenyConsent, handleResetConsent }
}
