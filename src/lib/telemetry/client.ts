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
    return
  }
  const toSend = buffer.splice(0)
  try {
    navigator.sendBeacon(TELEMETRY_ENDPOINT, JSON.stringify(toSend))
  } catch {
    // fire-and-forget — telemetry failures must never break the app
  }
}

function startTimer(): void {
  if (flushTimer !== null) {
    return
  }
  flushTimer = setInterval(flush, FLUSH_INTERVAL_MS)
}

if (typeof window !== 'undefined') {
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flush()
    }
  })
  window.addEventListener('pagehide', flush)
}

/** Buffers a telemetry event and flushes on interval or batch threshold; no-op when disabled. */
export function emit(event: TelemetryEvent): void {
  if (!isEnabled) {
    console.log('[telemetry]', event.name, event.properties)
    return
  }
  buffer.push(event)
  startTimer()
  if (buffer.length >= FLUSH_BATCH_SIZE) {
    flush()
  }
}
