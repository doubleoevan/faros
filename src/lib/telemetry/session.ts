// session id is generated once per session, in memory only.
let cachedSessionId: string | null = null

export function getSessionId(): string {
  if (cachedSessionId === null) {
    cachedSessionId = crypto.randomUUID()
  }
  return cachedSessionId
}
