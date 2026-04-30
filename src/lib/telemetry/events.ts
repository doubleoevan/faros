import { getSessionId } from './session'

export type TelemetryEvent = {
  name: string
  timestamp: string
  sessionId: string
  properties?: Record<string, string | number | boolean | null>
}

function makeEvent(
  name: string,
  properties?: Record<string, string | number | boolean | null>,
): TelemetryEvent {
  return { name, timestamp: new Date().toISOString(), sessionId: getSessionId(), properties }
}

export const events = {
  appSessionStarted: () => makeEvent('app.session.started'),
  employeesSearchChanged: (queryLength: number) =>
    makeEvent('employees.search.changed', { queryLength }),
  employeesFilterChanged: (field: string, value: string) =>
    makeEvent('employees.filter.changed', { field, value }),
  employeesDetailOpened: (employeeId: string) =>
    makeEvent('employees.detail.opened', { employeeId }),
  aiFlagEvaluated: (isEnabled: boolean) => makeEvent('ai.flag.evaluated', { isEnabled }),
  aiConsentRequested: () => makeEvent('ai.consent.requested'),
  aiConsentGranted: () => makeEvent('ai.consent.granted'),
  aiConsentDenied: () => makeEvent('ai.consent.denied'),
  aiInsightsRequested: (employeeId: string) => makeEvent('ai.insights.requested', { employeeId }),
  aiInsightsSucceeded: (employeeId: string, latencyMs: number, confidence: number) =>
    makeEvent('ai.insights.succeeded', { employeeId, latencyMs, confidence }),
  aiInsightsLowConfidence: (employeeId: string, confidence: number) =>
    makeEvent('ai.insights.low_confidence', { employeeId, confidence }),
  aiInsightsPiiFiltered: (employeeId: string) =>
    makeEvent('ai.insights.pii_filtered', { employeeId }),
  aiInsightsTimeout: (employeeId: string) => makeEvent('ai.insights.timeout', { employeeId }),
  aiInsightsRateLimited: (employeeId: string, retryAfterSeconds: number) =>
    makeEvent('ai.insights.rate_limited', { employeeId, retryAfterSeconds }),
  aiInsightsFailed: (employeeId: string, type: string) =>
    makeEvent('ai.insights.failed', { employeeId, type }),
  aiFeedbackSubmitted: (employeeId: string, rating: 'up' | 'down', responseHash: string) =>
    makeEvent('ai.feedback.submitted', { employeeId, rating, responseHash }),
  errorBoundaryTriggered: (boundary: string, errorMessage: string) =>
    makeEvent('error.boundary.triggered', { boundary, errorMessage }),
}
