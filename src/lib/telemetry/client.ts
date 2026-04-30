import { filterPii } from '../ai/pii'
import type { TelemetryEvent } from './events'

const isEnabled = import.meta.env.VITE_TELEMETRY_ENABLED !== 'false'
const FLUSH_INTERVAL_MS = 5_000
const FLUSH_BATCH_SIZE = 20

const graphqlUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/graphql'
const TELEMETRY_ENDPOINT = `${new URL(graphqlUrl).origin}/api/telemetry`

const buffer: TelemetryEvent[] = []
let flushTimer: ReturnType<typeof setInterval> | null = null

function flush(): void {
  if (buffer.length === 0) {
    if (flushTimer !== null) {
      clearInterval(flushTimer)
      flushTimer = null
    }
    return
  }
  const toSend = buffer.splice(0)
  // try/catch wraps JSON.stringify
  try {
    fetch(TELEMETRY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toSend),
      keepalive: true, // keepalive ensures delivery on unload.
    }).catch(() => {
      // fire-and-forget. telemetry failures must never break the app
    })
  } catch {
    // fire-and-forget. telemetry failures must never break the app
  }
  if (flushTimer !== null) {
    clearInterval(flushTimer)
    flushTimer = null
  }
}

function startTimer(): void {
  if (flushTimer !== null) {
    return
  }
  flushTimer = setInterval(flush, FLUSH_INTERVAL_MS)
}

// safety net: redact PII from string property values before the event leaves the client
function sanitizeEvent(event: TelemetryEvent): TelemetryEvent {
  if (!event.properties) {
    return event
  }
  let hasPii = false
  const sanitized: Record<string, string | number | boolean | null> = {}
  for (const [key, value] of Object.entries(event.properties)) {
    if (typeof value === 'string') {
      const { text, hasPii: valueHasPii } = filterPii(value)
      sanitized[key] = text
      if (valueHasPii) {
        hasPii = true
      }
    } else {
      sanitized[key] = value
    }
  }
  if (!hasPii) {
    return event
  }
  return { ...event, properties: { ...sanitized, _piiRedacted: true } }
}

if (typeof window !== 'undefined') {
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flush()
    }
  })
  window.addEventListener('pagehide', flush)
}

/**
 * Drains the event buffer immediately; useful for flush-before-navigate and testing.
 */
export function flushNow(): void {
  flush()
}

/**
 * Buffers a telemetry event and flushes on an interval or batch threshold; no-op when disabled.
 */
export function emit(event: TelemetryEvent): void {
  const safeEvent = sanitizeEvent(event)
  if (!isEnabled) {
    console.log('[telemetry]', safeEvent.name, safeEvent.properties)
    return
  }
  buffer.push(safeEvent)
  startTimer()
  if (buffer.length >= FLUSH_BATCH_SIZE) {
    flush()
  }
}
