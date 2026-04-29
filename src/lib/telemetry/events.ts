// typed event factories live here. populated when feature work begins.
export type TelemetryEvent = {
  name: string
  timestamp: string
  sessionId: string
  properties?: Record<string, string | number | boolean | null>
}
