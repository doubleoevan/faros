let cachedSessionId: string | null = null

/** Returns a stable per-session UUID, generated lazily and held in memory only. */
export function getSessionId(): string {
  if (cachedSessionId === null) {
    cachedSessionId = crypto.randomUUID()
  }
  return cachedSessionId
}
