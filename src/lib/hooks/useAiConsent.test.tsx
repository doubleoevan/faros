import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

vi.mock('@/lib/ai', () => ({
  hasValidAiConsentToken: vi.fn(() => false),
  getAiConsentToken: vi.fn(() => Promise.resolve('test-token')),
  clearAiConsentToken: vi.fn(),
}))

vi.mock('@/lib/telemetry', () => ({
  emit: vi.fn(),
  events: {
    aiConsentRequested: () => ({ name: 'ai.consent.requested', timestamp: '', sessionId: '' }),
    aiConsentGranted: () => ({ name: 'ai.consent.granted', timestamp: '', sessionId: '' }),
    aiConsentDenied: () => ({ name: 'ai.consent.denied', timestamp: '', sessionId: '' }),
  },
}))

import { hasValidAiConsentToken, getAiConsentToken, clearAiConsentToken } from '@/lib/ai'
import { emit } from '@/lib/telemetry'
import { useAiConsent } from './useAiConsent'

describe('useAiConsent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(hasValidAiConsentToken).mockReturnValue(false)
    vi.mocked(getAiConsentToken).mockResolvedValue('test-token')
  })

  it('starts idle when no token is cached', () => {
    const { result } = renderHook(() => useAiConsent())
    expect(result.current.consentStatus).toBe('idle')
  })

  it('starts granted when a valid token is already cached', () => {
    vi.mocked(hasValidAiConsentToken).mockReturnValue(true)
    const { result } = renderHook(() => useAiConsent())
    expect(result.current.consentStatus).toBe('granted')
  })

  it('emits aiConsentRequested once on mount when idle', () => {
    renderHook(() => useAiConsent())
    const calls = vi.mocked(emit).mock.calls
    expect(calls.some((call) => call[0].name === 'ai.consent.requested')).toBe(true)
  })

  it('does not emit aiConsentRequested when starting in granted state', () => {
    vi.mocked(hasValidAiConsentToken).mockReturnValue(true)
    renderHook(() => useAiConsent())
    const calls = vi.mocked(emit).mock.calls
    expect(calls.some((call) => call[0].name === 'ai.consent.requested')).toBe(false)
  })

  it('emits aiConsentRequested only once even after re-renders', async () => {
    const { rerender } = renderHook(() => useAiConsent())
    rerender()
    rerender()
    const requestedCalls = vi
      .mocked(emit)
      .mock.calls.filter((call) => call[0].name === 'ai.consent.requested')
    expect(requestedCalls).toHaveLength(1)
  })

  it('transitions to granted and emits aiConsentGranted on handleGrantConsent', async () => {
    const { result } = renderHook(() => useAiConsent())

    await act(() => result.current.handleGrantConsent())

    expect(result.current.consentStatus).toBe('granted')
    expect(vi.mocked(emit).mock.calls.some((call) => call[0].name === 'ai.consent.granted')).toBe(
      true,
    )
  })

  it('passes through requesting state while the token fetch is in flight', async () => {
    let resolveToken!: (value: string) => void
    vi.mocked(getAiConsentToken).mockReturnValue(
      new Promise<string>((resolve) => {
        resolveToken = resolve
      }),
    )

    const { result } = renderHook(() => useAiConsent())

    act(() => {
      void result.current.handleGrantConsent()
    })
    expect(result.current.consentStatus).toBe('requesting')

    await act(async () => {
      resolveToken('test-token')
    })
    expect(result.current.consentStatus).toBe('granted')
  })

  it('transitions to error when getAiConsentToken throws', async () => {
    vi.mocked(getAiConsentToken).mockRejectedValue(new Error('network error'))

    const { result } = renderHook(() => useAiConsent())
    await act(() => result.current.handleGrantConsent())

    expect(result.current.consentStatus).toBe('error')
  })

  it('transitions to denied and emits aiConsentDenied on handleDenyConsent', () => {
    const { result } = renderHook(() => useAiConsent())

    act(() => result.current.handleDenyConsent())

    expect(result.current.consentStatus).toBe('denied')
    expect(vi.mocked(emit).mock.calls.some((call) => call[0].name === 'ai.consent.denied')).toBe(
      true,
    )
  })

  it('resets to idle and clears the token cache on handleResetConsent', () => {
    vi.mocked(hasValidAiConsentToken).mockReturnValue(true)
    const { result } = renderHook(() => useAiConsent())

    expect(result.current.consentStatus).toBe('granted')

    act(() => result.current.handleResetConsent())

    expect(result.current.consentStatus).toBe('idle')
    expect(clearAiConsentToken).toHaveBeenCalledTimes(1)
  })
})
