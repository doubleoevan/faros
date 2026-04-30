import { useState, useEffect, useRef } from 'react'
import { getAiConsentToken, hasValidAiConsentToken } from '@/lib/ai'
import { emit, events } from '@/lib/telemetry'

export type AiConsentStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'error'

export type UseAiConsentResult = {
  consentStatus: AiConsentStatus
  handleConsentGrant: () => Promise<void>
  handleConsentDeny: () => void
}

/** Manages the AI consent state machine: prompt visibility, token retrieval, and telemetry. */
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

  async function handleConsentGrant(): Promise<void> {
    setConsentStatus('requesting')
    try {
      await getAiConsentToken()
      setConsentStatus('granted')
      emit(events.aiConsentGranted())
    } catch {
      setConsentStatus('error')
    }
  }

  function handleConsentDeny(): void {
    setConsentStatus('denied')
    emit(events.aiConsentDenied())
  }

  return { consentStatus, handleConsentGrant, handleConsentDeny }
}
