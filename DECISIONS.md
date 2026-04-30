# Decisions

Key technical decisions made during this project, organised by the six areas in the brief.

---

## 1. Architecture

**Single Vite app, no workspaces.**
There is one consumer and no shared library to factor out. Workspaces would be ceremony without payoff for a project at this scale. If a second consumer appeared, the existing `components/ui/` and `src/lib/` boundaries make extraction straightforward.

**Apollo Client with a normalised cache and a `Query.employee` field policy.**
The list query writes `Employee` entities to the normalised cache by `id`. The detail panel uses `cache-first` and the `Query.employee` field policy (in `apollo/client.ts`) redirects `employee(id)` to the already-normalised entity, so clicking View on a row returns immediately from cache with no extra round-trip. `Account.uid` mirrors the employee's `uid`, which would cause Apollo to collapse sibling accounts into the same cache entry; `keyFields: false` keeps them inline instead.

**URL as the source of truth for all filter/search/pagination state (nuqs).**
Filter values, search query, cursor trail, sort, and the open detail panel ID all live in the URL via nuqs. This makes state refresh-safe, shareable, and back-button compatible with no extra persistence logic.

**Cursor pagination via URL trail, not `fetchMore`.**
`fetchMore` writes the new page into the original query's cache slot; a subsequent URL change then causes Apollo to re-fetch the same query, producing a double-fetch. Keeping each cursor as a distinct URL gives each page its own cache entry, which Apollo deduplicates by variable shape. The cursor trail (`?cursor=A,B,C`) also lets the Previous button work without retaining in-memory history.

**Client-side sort only.**
The GraphQL schema exposes no `orderBy` argument. Sort is applied in the browser on the visible page. The stated limitation — sort does not cross pages — is expected and documented.

**Error boundaries at three independent levels: `root`, `employee-table`, `ai-insights`.**
A throw in the AI panel must not crash the table. A throw in the table must not crash the filters. Each boundary has its own recovery action: the AI panel clears nothing, the table boundary calls `apolloClient.resetStore()` to wipe stale cache, the root boundary is a last resort. All three emit `error.boundary.triggered` telemetry.

---

## 2. AI Development Environment and Workflow

**Treat the mock server as a real LLM service, not a stub.**
The brief says to discover AI endpoint behaviour by reading the mock server source (`../mock-server/ai-simulator.js`). We read it before writing a line of fetcher code and designed the client around the exact rates: ~5% timeouts (10–20 s hangs), ~15% PII contamination, ~10% low confidence, 10 req/min rate limit per IP, 1-hour consent token TTL.

**Consent-first with a cached token.**
A `POST /api/ai/consent` call produces a token before any insights request. The token is cached in memory with a 5-minute pre-expiry buffer so it is never used right at the edge of its 1-hour lifetime. A 401 or 403 from the insights endpoint triggers `handleResetConsent`, which clears the cache and returns the user to the consent prompt.

**AbortController timeout at 10 s.**
The server can hang 10–20 s before returning 504. Waiting that long would leave the panel in a permanent loading state. We abort at 10 s and surface a "Insights timed out" message with a retry button.

**Retry once on 5xx, never on 4xx / timeout / rate-limit.**
One retry with 1 s backoff is enough to recover from a transient server hiccup. Retrying a rate-limit response would immediately consume another slot. Retrying a timeout would just hang again for another 10 s. These failure modes each have their own telemetry event so they can be distinguished in the metrics.

**Feature flag gate with zero network calls when off (DEC-017).**
The entire AI panel — consent, insights, feedback — is behind `VITE_FEATURE_AI_INSIGHTS`. When the flag is off, the component renders a neutral placeholder and makes no network calls at all. The flag is compile-time (env var) rather than a runtime config endpoint because it controls a UI feature that is stable per deploy; the `FeatureFlagsContext` abstraction isolates the source so swapping to runtime config later is a contained change in `flags.ts` and `provider.tsx`.

---

## 3. Data and API Challenges

**Decoding the cursor format to enable forward page jumps.**
The mock server encodes cursors as `btoa("cursor:<last-index-of-prior-page>")`. We read `resolvers.js` to confirm the format and use it to synthesise cursors for arbitrary forward jumps without a sequential `fetchMore` walk. This is acknowledged as brittle: if a real API ships opaque cursors, the page-jump dropdown would need to fall back to sequential fetches.

**GraphQL chaos middleware.**
`chaos.js` injects random latency (50–800 ms), ~5% 5xx errors, and a 60 req/min rate limit on GraphQL routes. Apollo's `errorPolicy: 'all'` propagates partial errors to the UI rather than swallowing them; the `EmployeeTable` renders an inline error state with a retry when it receives one.

**AI rate limit is separate from GraphQL chaos.**
The AI endpoint has its own 10 req/min IP-based limit, distinct from GraphQL's 60 req/min chaos limit. The client reads `retryAfter` from the 429 response body and shows a live countdown before auto-retrying.

**Zod validation on every external response before it touches state.**
Both the consent response (`aiConsentResponseSchema`) and the insights response (`aiInsightsResponseSchema`) are validated with Zod. Validation failure is treated as a hard error — the response is discarded, an `ai.insights.failed { type: "validation" }` event fires, and the user sees the error fallback. This means a schema change in the AI API surfaces immediately as a distinct, traceable failure mode rather than a silent downstream crash.

---

## 4. Privacy and Security

**Explicit consent before any AI data is requested.**
The consent prompt is shown once per session. No AI call — including the consent token fetch — is made until the user clicks Allow. Denying hides the panel for the session. Re-authorization is required if the token expires.

**PII filtering on AI output before display.**
~15% of AI responses from the mock server contain injected PII: phone numbers (`(XXX) XXX-XXXX`), SSNs (`XXX-XX-XXXX`), email addresses, street addresses, and dates of birth. A regex pass in `lib/ai/pii.ts` redacts matches to `[REDACTED]` before the summary reaches the UI. A "Some content was filtered for privacy" banner is surfaced when any redaction occurs.

**The same PII regex runs on telemetry event properties before flush.**
`sanitizeEvent` in `lib/telemetry/client.ts` iterates every string property value before buffering the event. If a match is found, the value is redacted and `_piiRedacted: true` is added to the event so the safety-net trigger is itself observable.

**Search queries send `queryLength`, not the query text.**
Employee names are PII. The `employees.search.changed` event records only the character count of the debounced query, not its content, so names typed into the search box never appear in telemetry. This was identified as a gap during code review and corrected before the task was committed.

**Consent token lives in memory only.**
The token is held in module-level state in `lib/ai/aiConsent.ts`. It is never written to `localStorage`, `sessionStorage`, or a cookie. A page reload requires re-authorization.

**Telemetry transport: `fetch` with `keepalive: true` (DEC-016).**
`navigator.sendBeacon` with a raw JSON string sends `text/plain`, not `application/json`, and a synchronous `JSON.stringify` failure would escape the `.catch()` handler. `fetch({ keepalive: true })` sends the correct content-type, survives page unload (same guarantee as `sendBeacon`), and is wrapped in `try/catch` so serialisation failures are swallowed rather than propagated.

---

## 5. What To Do With More Time

**AI insights cache by employee ID.**
Every time the detail panel opens for an employee, a fresh insights request is made. Caching the response in memory keyed by `employeeId` with a short TTL (e.g. 5 minutes) would eliminate redundant calls and reduce rate-limit pressure from users switching between employees.

**Server-side sort.**
Client-side sort applies only to the visible page, which is the correct behaviour given the current API. With an `orderBy` argument in the GraphQL schema, sorting across the full dataset would be straightforward.

**Richer PII detection.**
The regex catches structured PII patterns reliably. Freeform names used contextually, partial addresses, and uncommon phone formats are not caught. A lightweight NER pass — or a server-side filtering step in the AI pipeline — would raise the bar.

**Runtime feature flags.**
The current env-var approach requires a redeploy to toggle. A config endpoint fetched on load (validated with Zod, falling back to the env-var default if the fetch fails) would allow flag changes without a deploy. The `FeatureFlagsContext` boundary already isolates the mechanism.

**Telemetry dashboard.**
The pipeline is fully instrumented — events are batched, flushed, and structured. Without a dashboard, the metrics exist only as raw events. A Grafana board or similar built on the formulas in `RUNBOOK.md` would make the health metrics actionable.

**End-to-end tests.**
The suite covers unit and component-integration tests with MSW. Playwright tests for the full user journey — search, filter, open panel, consent, read insights, submit feedback — would catch integration failures across the real network layer.

**Accessibility audit.**
The AI panel has dynamic content (loading → consent → insights → error) that may need `aria-live` announcements. The current ARIA labels cover the static structure but have not been verified with a screen reader.

---

## 6. Testing Strategy

**What was tested and why.**

_`lib/ai/pii.ts`_ — regex edge cases: phone numbers in multiple formats, email addresses, false positives, partial matches. PII leaks have real consequences; the regex is the last line of defence before content reaches the UI and telemetry.

_`lib/ai/schemas.ts`_ — Zod parsing of valid responses, malformed responses, missing required fields, and extra fields. Guards against silent schema drift from the AI endpoint.

_`lib/ai/fetcher.ts`_ — happy path, 5xx + retry, 4xx no retry, `AbortController` timeout, rate-limit 429, network error. The retry and abort logic is the most likely source of subtle bugs under chaos conditions.

_`lib/ai/aiConsent.ts`_ — token caching, expiry behaviour, re-fetch on 401. A broken cache would either make a consent request on every insights call (rate-limit pressure) or silently use an expired token (auth failures).

_`lib/telemetry/client.ts`_ — PII sanitisation in `emit`, flush timer lifecycle. Telemetry failures are silent by design; tests make regression visible.

_`components/ai/InsightsPanel.tsx`_ — full integration with MSW, covering consent flow, success rendering, low-confidence badge, PII banner, timeout fallback, feedback submission, and telemetry event assertions for each path.

_`components/employees/EmployeeDetailPanel.tsx`_ — feature flag gate: off state shows a neutral placeholder and makes no AI network calls; on state shows the consent prompt; `ai.flag.evaluated` fires with the correct `isEnabled` value. This test guards against the flag gate silently breaking and leaking consent or insights requests.

_`app/EmployeesDashboard.tsx`_ — search debouncing, filter chip cursor-reset, detail panel opening from the View button without triggering an extra `Employees` GraphQL request.

**What was skipped and why.**

Snapshot tests: brittle, low signal. Visual regressions are better caught by human review or a visual diffing tool.

Coverage targets: optimised for test value, not percentage. Trivial render tests for shadcn-wrapped primitives would inflate coverage without catching real bugs.

Unit tests for pure layout components: pixel-perfect correctness is faster to verify visually than with assertions over Tailwind class names.
