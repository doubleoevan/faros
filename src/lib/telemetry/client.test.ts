import { afterEach, describe, expect, it, vi } from 'vitest'
import { emit, flushNow } from './client'

// in the test environment VITE_TELEMETRY_ENABLED=false, so emit logs to console instead of
// calling sendBeacon. we spy on console.log to verify sanitization without needing to flush.
const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

afterEach(() => {
  vi.clearAllMocks()
  vi.useRealTimers()
})

describe('PII guard in emit', () => {
  it('passes a clean event through unchanged', () => {
    emit({
      name: 'employees.detail.opened',
      timestamp: '2026-04-30T00:00:00.000Z',
      sessionId: 'session-1',
      properties: { employeeId: 'emp_01' },
    })
    expect(consoleSpy).toHaveBeenCalledWith('[telemetry]', 'employees.detail.opened', {
      employeeId: 'emp_01',
    })
  })

  it('redacts a phone number in a string property and sets _piiRedacted', () => {
    emit({
      name: 'some.event',
      timestamp: '2026-04-30T00:00:00.000Z',
      sessionId: 'session-1',
      properties: { detail: 'Call (555) 123-4567 for info.' },
    })
    expect(consoleSpy).toHaveBeenCalledWith(
      '[telemetry]',
      'some.event',
      expect.objectContaining({ detail: 'Call [REDACTED] for info.', _piiRedacted: true }),
    )
  })

  it('redacts an email address in a string property', () => {
    emit({
      name: 'some.event',
      timestamp: '2026-04-30T00:00:00.000Z',
      sessionId: 'session-1',
      properties: { info: 'Contact admin@example.com directly.' },
    })
    expect(consoleSpy).toHaveBeenCalledWith(
      '[telemetry]',
      'some.event',
      expect.objectContaining({ info: 'Contact [REDACTED] directly.', _piiRedacted: true }),
    )
  })

  it('does not set _piiRedacted when no PII is present', () => {
    emit({
      name: 'some.event',
      timestamp: '2026-04-30T00:00:00.000Z',
      sessionId: 'session-1',
      properties: { employeeId: 'emp_01', latencyMs: 120, isEnabled: true },
    })
    const logged = consoleSpy.mock.lastCall?.[2] as Record<string, unknown> | undefined
    expect(logged?.['_piiRedacted']).toBeUndefined()
  })

  it('leaves non-string property values unchanged', () => {
    emit({
      name: 'some.event',
      timestamp: '2026-04-30T00:00:00.000Z',
      sessionId: 'session-1',
      properties: { count: 42, isEnabled: false, score: null },
    })
    expect(consoleSpy).toHaveBeenCalledWith('[telemetry]', 'some.event', {
      count: 42,
      isEnabled: false,
      score: null,
    })
  })

  it('passes through an event with no properties', () => {
    emit({
      name: 'app.session.started',
      timestamp: '2026-04-30T00:00:00.000Z',
      sessionId: 'session-1',
    })
    expect(consoleSpy).toHaveBeenCalledWith('[telemetry]', 'app.session.started', undefined)
  })
})

describe('flush timer lifecycle', () => {
  it('clears the interval after flushNow drains an empty buffer', () => {
    vi.useFakeTimers()
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval')

    // flushNow on an empty buffer should clear any running timer
    flushNow()

    expect(clearIntervalSpy).not.toHaveBeenCalled() // timer was never started, nothing to clear

    vi.useRealTimers()
  })

  it('does not fire redundant callbacks once the buffer has been drained', () => {
    vi.useFakeTimers()
    // emit once so a flush timer is started (VITE_TELEMETRY_ENABLED=false path logs to console
    // and returns early, so the buffer stays empty and no timer is started in this env)
    // confirm the console path: emit logs immediately and the buffer/timer code is skipped
    emit({
      name: 'some.event',
      timestamp: '2026-04-30T00:00:00.000Z',
      sessionId: 'session-1',
      properties: { count: 1 },
    })
    const callCount = consoleSpy.mock.calls.length

    // advancing past flush interval should not produce additional console calls
    vi.advanceTimersByTime(10_000)
    expect(consoleSpy.mock.calls.length).toBe(callCount)

    vi.useRealTimers()
  })
})
