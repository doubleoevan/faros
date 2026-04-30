# AI Insights Triage Runbook

When AI insights misbehave, work through these checks in order.

---

## 1. Is the feature flag on?

**Telemetry:** `ai.flag.evaluated { isEnabled: false }`

If the flag is off the panel renders a neutral placeholder and makes zero network calls — nothing else in this runbook applies.

**Fix:** set `VITE_FEATURE_AI_INSIGHTS=true` and redeploy (or restart dev server).

---

## 2. Is the server running?

Check `http://localhost:4000/health` or any GraphQL query. If GraphQL is also returning errors, the mock server is down.

**Fix:** `cd ../mock-server && npm start`

---

## 3. Is consent working?

**Telemetry to watch:**

| Event                  | Meaning                                   |
| ---------------------- | ----------------------------------------- |
| `ai.consent.requested` | Consent prompt was shown to user          |
| `ai.consent.granted`   | User clicked Allow; token fetch succeeded |
| `ai.consent.denied`    | User clicked No thanks                    |

**High drop-off between `.requested` and `.granted`:** users are declining, or the `POST /api/ai/consent` call is failing.

Manually test consent: `POST http://localhost:4000/api/ai/consent` with body `{ "userId": "test", "scope": "insights" }` — should return a `consentToken` and `expiresAt` (~1 hour ahead).

**Token expiry:** the client caches the token and re-fetches 5 minutes before the 1-hour server expiry. A 401/403 from the insights endpoint triggers `handleResetConsent`, which clears the cache and returns the user to the consent prompt. If users are being asked to re-authorize more than once per hour, the token cache (`src/lib/ai/aiConsent.ts`) is being cleared unexpectedly — check for page reloads or module resets.

---

## 4. What failure mode are insights hitting?

Look at the ratio of `ai.insights.*` events against `ai.insights.requested` as the denominator.

### Timeouts — `ai.insights.timeout`

Client aborts after 10 s via `AbortController`. The mock server hangs 10–20 s on ~5% of requests before returning 504.

**Expected baseline:** ~5% timeout rate against the mock server.  
**Investigate if:** rate is consistently above 10%, or users report the panel never loading.  
**Fix:** The AI service is degraded. No client-side fix — the 10 s limit is intentional. Disable the flag (`VITE_FEATURE_AI_INSIGHTS=false`) while the service recovers. The panel falls back to a "Insights timed out" message with a retry button.

### Rate limits — `ai.insights.rate_limited { retryAfterSeconds }`

The AI endpoint allows **10 requests per minute per IP** (separate from GraphQL's 60/min chaos limit). The client shows a countdown and auto-retries when the window resets.

**Investigate if:** `ai.insights.rate_limited` accounts for a significant fraction of requests, or users are seeing the countdown frequently.  
**Fix:** reduce the number of simultaneous sessions hitting the endpoint, or increase `AI_RATE_LIMIT` in the mock server's `.env`.

### Server errors — `ai.insights.failed { type: "server_error" }`

The client retries once on 5xx with a 1 s delay. This event fires only after both attempts fail.

**Fix:** check mock server logs for stack traces. If persistent, toggle the flag off.

### Validation failures — `ai.insights.failed { type: "validation" }`

The Zod schema (`src/lib/ai/schemas.ts → aiInsightsResponseSchema`) rejected the response. This means the AI endpoint changed its response shape.

**Fix:** compare the live response body against `aiInsightsResponseSchema`. Update the schema and regenerate types if the API contract changed intentionally.

### Network errors — `ai.insights.failed { type: "network" }`

The fetch threw before receiving a response (DNS failure, CORS, connection refused).

**Fix:** verify `VITE_API_URL` is correct and the server is reachable. Check browser devtools Network tab for the actual error.

### Unauthorized — `ai.insights.failed { type: "unauthorized" }`

401 or 403 from the insights endpoint: no consent token, unrecognized token, or expired token.

**Fix:** the `handleResetConsent` flow should recover automatically. If 401s are systematic, the consent token is not being passed correctly — check the `X-Consent-Token` header in devtools.

---

## 5. Quality signals

These fire alongside a successful response and do not indicate failure, but high rates warrant investigation.

| Event                        | Baseline (mock)   | What it means                                                                                                                            |
| ---------------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `ai.insights.low_confidence` | ~10% of successes | Confidence ≤ 0.30; panel shows a warning badge. High rate = model uncertainty.                                                           |
| `ai.insights.pii_filtered`   | ~15% of successes | Response contained phone, email, SSN, address, or DOB. Regex-redacted before display. High sustained rate = contact AI service provider. |

The mock server injects PII types: `(XXX) XXX-XXXX` phone, `XXX-XX-XXXX` SSN, `firstname.personalXX@gmail.com` email, street address, date of birth. The client-side regex (`src/lib/ai/pii.ts`) redacts all of these and surfaces a "Some content was filtered for privacy" banner.

---

## 6. Error boundaries

**Telemetry:** `error.boundary.triggered { boundary, errorMessage }`

| `boundary` value | What it means                                                                                                                        |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `ai-insights`    | A component inside the AI panel threw during render. User sees a fallback with a retry button. Does not affect the rest of the page. |
| `employee-table` | The employee table subtree threw. Apollo `resetStore` is called on retry.                                                            |
| `root`           | Catastrophic failure — the entire app crashed.                                                                                       |

For `ai-insights` boundary errors, check `errorMessage` in the telemetry event. Common causes: a `null` dereference in `InsightsPanel` when the response shape is unexpected (fix: schema validation), or a React rendering invariant violation.

---

## 7. Key health metrics

Compute these from the telemetry stream:

```
Success rate        = ai.insights.succeeded / ai.insights.requested
Timeout rate        = ai.insights.timeout   / ai.insights.requested
Rate-limit rate     = ai.insights.rate_limited / ai.insights.requested
Consent grant rate  = ai.consent.granted    / ai.consent.requested
Low-confidence rate = ai.insights.low_confidence / ai.insights.succeeded
PII filter rate     = ai.insights.pii_filtered   / ai.insights.succeeded
p50 / p95 latency   = distribution of latencyMs from ai.insights.succeeded
```

**Healthy baselines against mock server:** success rate ~80–85%, timeout ~5%, low-confidence ~10%, PII ~15%, p50 latency 1–3 s.

---

## 8. Configuration reference

| Variable                                 | Default                         | Effect                                       |
| ---------------------------------------- | ------------------------------- | -------------------------------------------- |
| `VITE_FEATURE_AI_INSIGHTS`               | `true`                          | Enables/disables the entire AI panel         |
| `VITE_TELEMETRY_ENABLED`                 | `false`                         | `false` = log to console only, no HTTP flush |
| `VITE_API_URL`                           | `http://localhost:4000/graphql` | Base URL for GraphQL and AI endpoints        |
| `AI_RATE_LIMIT` (server `.env`)          | `10`                            | AI requests per minute per IP                |
| `AI_TIMEOUT_RATE` (server `.env`)        | `0.05`                          | Fraction of requests that hang               |
| `AI_PII_RATE` (server `.env`)            | `0.15`                          | Fraction of responses with injected PII      |
| `AI_LOW_CONFIDENCE_RATE` (server `.env`) | `0.10`                          | Fraction of responses with low confidence    |
