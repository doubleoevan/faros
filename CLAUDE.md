# CLAUDE.md

Project instructions for Claude Code. Read this in full at the start of every session.

**Spec & ongoing notes (Notion):** https://app.notion.com/p/35162400378d81d48dd1d3782566d843

---

## Project overview

Frontend take-home for Faros AI: an Employee Insights Dashboard that consumes a mock GraphQL API and an AI insights REST endpoint. Two views — an employee table (Figma pixel-perfect) and an employee detail panel with AI-generated activity insights.

The mock server is **not** part of this repo. It runs separately at `http://localhost:4000` and is provided by Faros. It deliberately injects chaos: variable latency, ~5% errors on GraphQL, ~5% timeouts and ~15% PII contamination on AI responses, plus rate limits. Treat the AI endpoint as a real LLM service.

This app is the consumer of AI output, **not** a producer of it. We do not craft prompts or pick models. There is no prompts table, no models table.

Treat this as a full project, not a throwaway. Documentation, tests, CI, and conventions match what we'd want in a real codebase.

---

## Tech stack

- TypeScript strict (no `any`, no unjustified `as` casts)
- Vite + React 18
- Tailwind v4
- shadcn/ui (`components/ui/`)
- Apollo Client (GraphQL is normalized cache; cursor pagination via `fetchMore`)
- graphql-codegen (output committed to `src/lib/apollo/generated.ts`)
- Zod for runtime validation of every external response, especially AI
- nuqs for URL-as-state (filters, search, pagination)
- react-error-boundary for failure isolation
- Vitest + Testing Library + MSW for tests
- pnpm (matches our toolchain choice; mock server still uses npm in its own folder)

---

## Architecture

Single Vite app at the repo root. One consumer app, no shared library to factor out — workspaces would be ceremony without payoff for an 8-hour-ish take-home. shadcn primitives live in `components/ui/` and import directly. If a second consumer ever appeared, splitting into a workspace at that point would be straightforward.

```
faros/
├── .github/workflows/ci.yml          typecheck, lint, test, build
├── .vscode/                          settings, recommended extensions
├── docs/
│   └── screenshots/
│       └── employees-page.png        Figma reference for Part 1
├── public/
│   ├── icons/                        github.png, jira.png, pagerduty.png, google-calendar.png
│   └── faros-logo.svg
├── src/
│   ├── main.tsx                      entry
│   ├── App.tsx                       root composition
│   ├── app/
│   │   ├── providers.tsx             Apollo, Flags, Telemetry, ErrorBoundary
│   │   └── EmployeesDashboard.tsx    page-level composition
│   ├── components/
│   │   ├── ui/                       shadcn primitives only
│   │   ├── employees/                table, row, search, filters, pagination, detail panel
│   │   ├── ai/                       InsightsPanel, ConsentPrompt, ConfidenceBadge, PiiNotice, InsightFeedback, InsightSkeleton
│   │   └── feedback/                 ErrorBoundary, ErrorFallback, LoadingSkeleton, EmptyState
│   ├── lib/
│   │   ├── apollo/                   client, queries, fragments, generated.ts (committed)
│   │   ├── ai/                       consent, fetcher, schemas, pii
│   │   ├── telemetry/                client, events, session
│   │   ├── flags/                    flags, provider, useFlag
│   │   ├── hooks/                    useDebouncedValue, useEmployees, useEmployeeInsights, useConsent
│   │   └── utils.ts                  cn helper
│   ├── styles/
│   │   ├── globals.css               tailwind layers
│   │   └── tokens.ts                 typed design tokens
│   ├── types/                        domain types, z.infer exports
│   └── test/
│       ├── setup.ts                  vitest globals, jsdom, MSW server start
│       ├── render.tsx                render with all providers
│       └── mocks/                    MSW handlers, fixtures, opt-in chaos
├── codegen.ts                        graphql-codegen config
├── eslint.config.js                  flat config, type-aware
├── prettier.config.js
├── tailwind.config.ts
├── tsconfig.json + tsconfig.node.json
├── vite.config.ts
├── vitest.config.ts
├── .env.example                      VITE_API_URL, VITE_AI_FLAG_DEFAULT, VITE_TELEMETRY_ENABLED
├── .nvmrc                            20
├── .npmrc                            engine-strict, strict-peer-dependencies
├── package.json
├── pnpm-lock.yaml
├── CLAUDE.md
├── README.md
├── DECISIONS.md
└── RUNBOOK.md
```

**Tests are co-located.** `EmployeeTable.test.tsx` next to `EmployeeTable.tsx`. The `src/test/` folder holds **only** shared infrastructure (setup, render helper, MSW handlers, fixtures) — never actual test files.

**Patterns:**

- One feature flag gate around AI insights, checked at the panel boundary.
- Every external response validated with Zod before it touches UI state.
- Every async failure has a typed error path and a telemetry event.
- URL is the source of truth for filter/search/pagination state (via nuqs). Refresh-safe, shareable.

---

## Design references

- `docs/screenshots/employees-page.png` — target layout for the Employees page (table + right-side detail drawer pattern). Consult before changing the table columns, filter UI, or the detail panel layout. The Figma is the source of truth for Part 1; this screenshot is a fallback when the Figma isn't open.

---

## Mock server context

The mock server source lives at `../mock-server/` (sibling of this repo, intentionally not committed here per the spec). Reading it is encouraged — the chaos behavior is intentional, and the spec hints we should discover the AI endpoint's behavior by reading the source.

Key files to consult when relevant:
- `../mock-server/chaos.js` — defines latency, error rates, timeout %, PII injection %, rate limits. Read this before tuning timeouts, retry logic, or PII filtering.
- `../mock-server/ai-simulator.js` — the AI endpoint behavior (consent flow, low-confidence responses, PII contamination). Read this before implementing the AI fetcher or insights panel.
- `../mock-server/resolvers.js` — GraphQL resolvers, filter/pagination shape. Read this before writing GraphQL queries or pagination logic.
- `../mock-server/server.js` — top-level routing, middleware, rate-limit setup.

When in doubt about API behavior, read the source rather than guess.

---

## Coding rules

- Use functional React components. No class components.
- Use Tailwind utilities. **No** inline styles, **no** CSS modules, **no** hardcoded hex values.
- Use shadcn/ui from `components/ui/` wherever it fits. Add new primitives via `pnpm dlx shadcn@latest add <name>`.
- TypeScript strict throughout. **No** `any`. **No** `as` casts without a comment justifying why.
- Always use `cn` from `lib/utils.ts` for class merging. Never string concatenation or template literals for Tailwind classes.
- Every component that accepts a `className` prop must pass it through `cn`.
- Validate every external API response with Zod before using it.
- Every fetch the user can trigger must have: loading state, error state, empty state, and a telemetry event on each branch.

---

## Naming conventions

No abbreviations or acronyms in variable names. Write the full word, always.

- `res` → `response`
- `req` → `request`
- `err` → `error`
- `btn` → `button`
- `val` → `value`
- `e` → `event`
- `cb` → `callback`
- `tmp` / `temp` → a descriptive name for what it actually holds

**Exception:** well-established domain abbreviations that are clearer than the full word are fine: `url`, `id`, `api`, `html`, `css`, `sdk`.

**Boolean variables and props** must be prefixed with `is`, `has`, `can`, `should`, or `will`. Examples: `isPopular`, `isLoading`, `hasError`, `canSubmit`.

---

## Comment style

- Place the comment **above** the block it describes. Never inline at the end of a line.
- One comment per logical group of lines; the comment acts as the visual separator. No blank line between comment and code.
- Keep comments short and lowercase: `// close the menu on escape key press`, `// parse the request body`.
- JSX section comments use `{/* section name */}` — simple, no decorators or dividers.

```typescript
// parse the request body
const body: unknown = await request.json()
const result = schema.safeParse(body)
// handle errors
if (!result.success) {
  return Response.json({ error: 'Invalid input' }, { status: 400 })
}
```

---

## Brace style

Always use curly braces for `if` / `else` blocks — even single-line ones. Never omit braces. Same rule for `for`, `while`, and `else` — always braces, always a new line.

```typescript
// never
if (response.ok) setSubmitted(true)
// always
if (response.ok) {
  setSubmitted(true)
}
```

---

## Design system

- Follow shadcn patterns. Add primitives via `pnpm dlx shadcn@latest add <name>`.
- Use design tokens from `styles/tokens.ts` instead of hex values inline.
- Match the Figma pixel-perfect for Part 1 (the table). Part 2 (AI panel) is our design — it must feel **trustworthy**: clear labels for AI-generated content, confidence indication, source/recency, easy way to give feedback.

---

## AI integration rules (Part 2)

The `/api/ai/insights/:employeeId` endpoint behaves like a real LLM service. Follow these rules:

1. **Consent first.** Obtain a token via `POST /api/ai/consent` with `{ userId, scope: "insights" }`. Cache it (memory, 1-hour TTL). Show a one-time consent UI before the first AI call per session. Re-prompt if the token is missing or rejected.
2. **Timeout at 10s.** Use `AbortController`. The endpoint will sometimes hang past 10s; never block the user.
3. **Retry once on 5xx with backoff.** Do **not** retry on 4xx, timeouts, or rate-limit responses.
4. **Validate response with Zod.** If validation fails, treat as failure, log telemetry, show fallback.
5. **Filter PII.** ~15% of responses contain PII (emails, phone numbers). Run a regex pass; if matched, redact and surface a banner: "Some content was filtered for privacy."
6. **Show confidence.** ~10% of responses are low-confidence. Display a clear visual cue and an explanation. Never present low-confidence output as authoritative.
7. **Feature flag gate.** Wrap the entire AI panel in a feature flag check from `lib/flags`. If disabled, render a neutral placeholder, no network call.
8. **User feedback loop.** Thumbs up / down on every insight. Send to telemetry. This is the human-in-the-loop signal evaluators look for.
9. **Fallback UX.** When AI fails or is disabled, the detail panel still works — show the raw activity data without AI commentary.

---

## Telemetry

**Why telemetry exists in this app:**

1. **Operational debugging.** When a user says "AI insights didn't work for me at 3pm," we can find the request and see whether it timed out, was rate-limited, hit a Zod validation error, etc.
2. **Health metrics.** Success rate, p50/p95/p99 latency, rate-limit hit rate. These power dashboards and alerts in production.
3. **Product signals.** Are people using the AI panel? Thumbs up vs down? Where does the consent flow get abandoned?
4. **Feature flag decision-making.** If we flip the AI flag off for a cohort, telemetry tells us whether it mattered.

**Structured means typed events with stable names and stable property keys.** Not `console.log("user clicked thing")`.

```typescript
type TelemetryEvent = {
  name: string                  // dot-namespaced: 'ai.insights.succeeded'
  timestamp: string             // ISO 8601
  sessionId: string             // generated once per session, in-memory
  properties?: Record<string, string | number | boolean | null>
}
```

**Events to emit, with reasoning:**

| Event | Why |
| --- | --- |
| `app.session.started` | Denominator for every other rate calculation |
| `employees.search.changed` | Are filters used? Sample with debounce so we don't flood |
| `employees.filter.changed` | Same — which filters get used? |
| `employees.detail.opened` | Engagement with the detail view |
| `ai.flag.evaluated` | Confirms flag delivery; denominator for AI rates |
| `ai.consent.requested` / `.granted` / `.denied` | Consent funnel; where do users drop off? |
| `ai.insights.requested` | Demand for AI feature |
| `ai.insights.succeeded` (with `latencyMs`, `confidence`) | Success rate, latency, confidence distribution |
| `ai.insights.low_confidence` | Quality signal — how often is the model unsure? |
| `ai.insights.pii_filtered` | Safety signal — how often does PII reach our filter? |
| `ai.insights.timeout` / `.rate_limited` / `.failed` | Failure modes broken out, never lumped |
| `ai.feedback.submitted` (with `rating`) | Human-in-the-loop quality signal |
| `error.boundary.triggered` (with `boundary`, `errorMessage`) | Where the app crashes |

**Privacy rule:** never send PII in telemetry. Employee IDs are fine. Names, emails, phone numbers, and AI-generated text are not. The PII regex used for AI response filtering also runs on event property values as a safety net before send.

**Delivery:**

- **Batched.** Buffer events in memory and flush every 5s or every 20 events, whichever comes first. Don't fire one HTTP request per click.
- **`navigator.sendBeacon` on `visibilitychange` and `pagehide`.** Ensures buffered events are not lost when the page closes.
- **Fire-and-forget.** Telemetry failures must never break the app or block user actions. Wrap in try/catch and swallow.
- **Disable cleanly.** If `VITE_TELEMETRY_ENABLED=false`, the emitter becomes a no-op. The dev console still logs events for local visibility.

**Implementation lives in `src/lib/telemetry/`:**

- `events.ts` — typed event factories. Single source of all event names. Importing a non-existent event is a type error.
- `client.ts` — buffer, flush logic, `sendBeacon` integration, fire-and-forget POST.
- `session.ts` — session id (`crypto.randomUUID()`, in memory).
- `index.ts` — barrel.

---

## Testing strategy

The Faros spec says: *"Write tests where they add value. We'd rather see thoughtful tests for AI content validation than 100% coverage of trivial components."*

**What gets tested (Vitest + Testing Library + MSW):**

- `lib/ai/pii.ts` — PII detection regex, redaction. Edge cases: emails, phone numbers in various formats, false positives, partial matches.
- `lib/ai/schemas.ts` — Zod parsing of valid responses, malformed responses, missing fields, extra fields.
- `lib/ai/fetcher.ts` — happy path, 5xx + retry, 4xx no retry, timeout via AbortController, rate-limit response, network error.
- `lib/ai/consent.ts` — token caching, expiry behavior, re-fetch on 401.
- `lib/telemetry/client.ts` — batching, flush triggers, sendBeacon on unload, no-op when disabled, never throws.
- `components/ai/InsightsPanel.tsx` — full integration test with MSW: consent flow, success, low-confidence rendering, PII banner, timeout fallback, feedback submission emits telemetry.

**What gets skipped:**

- Trivial render tests for shadcn-wrapped components.
- Snapshot tests (brittle, low signal).
- Coverage targets (we optimize for value, not %).

**MSW** runs against the same network layer as production, so we can replay each chaos mode (success, low-confidence, PII, timeout, 5xx, rate-limit) deterministically.

---

## Commands

```bash
# install
pnpm install
# dev (run mock server separately at :4000 first)
pnpm dev
# build
pnpm build
# typecheck
pnpm typecheck
# lint
pnpm lint
# test (watch)
pnpm test
# test (CI / once)
pnpm test:run
# regenerate graphql types (commit the output)
pnpm codegen
# add a shadcn primitive
pnpm dlx shadcn@latest add <name>
```

The mock server runs in a separate terminal:

```bash
cd ../mock-server
npm install
cp .env.example .env
npm start
```

---

## When in doubt

- Read the mock server source. The behavior is intentional.
- Match the Figma pixel-perfect for Part 1.
- Optimize for **trustworthiness** in the AI panel, not flashiness.
- Production thinking (telemetry, flags, runbook, tests) is worth more than extra features.
- Update the Notion spec page as decisions get made.