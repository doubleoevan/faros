# CLAUDE.md

Project instructions for Claude Code. Read this in full at the start of every session.

**Notion sources** — read the relevant ones at the start of every session.

- **Take-home** — https://app.notion.com/p/35162400378d81d48dd1d3782566d843 — full project spec, scope, plan.
- **Sprint / Tasks** — https://app.notion.com/p/35162400378d817089bec68c12058c35 — numbered tasks. One task = one commit. Pick up the next 🔴 task in sequence. Update status to 🟢 **only after** verifying the listed deliverable actually exists.
- **Decision Log** — https://app.notion.com/p/35162400378d813e9a28e5a3bcf9a450 — DEC-### entries defending each tech choice. Reference DEC-IDs in commits when relevant. Append new entries; never edit accepted ones.
- **API Reference** — https://app.notion.com/p/35162400378d810d97e9d09c3d580995 — GraphQL SDL, filter shapes, pagination, AI endpoint behavior, observed quirks. Read it before writing any GraphQL operation, AI fetcher, or telemetry call. Update it when new quirks surface.

---

## Project overview

Frontend take-home for Faros AI: an Employee Insights Dashboard that consumes a mock GraphQL API and an AI insights REST endpoint. Two views — an employee table (Figma pixel-perfect) and an employee detail panel with AI-generated activity insights.

The mock server is **not** part of this repo. It runs separately at `http://localhost:4000` and is provided by Faros. It deliberately injects chaos: variable latency, ~5% errors on GraphQL, ~5% timeouts and ~15% PII contamination on AI responses, plus rate limits. Treat the AI endpoint as a real LLM service.

This app is the consumer of AI output, **not** a producer of it. We do not craft prompts or pick models. There is no prompts table, no models table.

Treat this as a full project, not a throwaway. Documentation, tests, CI, and conventions match what we'd want in a real codebase.

---

## Workflow

- **One task = one commit, pushed directly to `main`.** Trunk-based — no branches, no PRs. Conventional commits exactly as written in the Sprint / Tasks page (`feat:`, `chore:`, `docs:`, `test:`, `style:`). Run `pnpm typecheck && pnpm lint && pnpm test:run` before every push so `main` stays green.
- **The user commits manually.** Claude never runs `git add`, `git commit`, or `git push` — the user reviews changes in Cursor and commits with their own hands. After implementing a task and running the local checks, surface the diff and a proposed commit message for the user's reference, then stop. When the user moves on to the next task, treat it as confirmation the previous task was committed.
- **Sequential.** Don't skip ahead — Phase 0 unblocks Phase 1, etc.
- **Don't mark a task 🟢 until the deliverable exists.** "Done" means the artifact named in the task (file, Notion section, schema entry) is actually present and the listed acceptance criteria are met. If unsure, leave it 🟡 and flag in the response.
- **Pause at the end of each phase.** Don't roll forward into the next phase without an explicit go-ahead.
- **Update Notion as you go.** New tech decision → append a DEC-### entry to Decision Log. New API quirk → update API Reference. New scope clarification → update Take-home. These pages feed `DECISIONS.md` at submission.

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
│   │   ├── feature-flags/            flags, provider, useFeatureFlag
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

- `../mock-server/chaos.js` — Express middleware applied to the GraphQL routes: random latency (50–800ms), 5xx error injection (~5%), and a per-IP rate limit (60/min). Read this before interpreting random GraphQL 5xx responses or tuning GraphQL retry/backoff.
- `../mock-server/ai-simulator.js` — the AI endpoint behavior: consent token issuance and 1-hour expiry, AI-specific rate limit (10/min, separate from chaos.js), timeout simulation (~5%, hangs 10–20s then 504), low-confidence responses (~10%), and PII contamination (~15%). Read this before implementing the AI fetcher, timeout/retry logic, PII filtering, or the consent flow.
- `../mock-server/resolvers.js` — GraphQL resolvers, filter/pagination shape. Read this before writing GraphQL queries or pagination logic.
- `../mock-server/server.js` — top-level routing, middleware, rate-limit setup.

When in doubt about API behavior:

1. Check the **API Reference** Notion page first — it captures what we've already discovered.
2. If it's not there, read the mock server source.
3. Add what you find back to the API Reference so the next session doesn't have to rediscover it.

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

**Self-documenting names.** A reader should be able to tell what a variable is from its name alone, without inferring from surrounding code or domain vocabulary. Prefer the plain meaning over the technical-spec term when they diverge — e.g., `currentPageSize` (the count of items rendered now) over `edgeCount` (Relay-spec word for the same thing). Plural URL keys plural — `cursors` for `?cursor=A,B,C`, not `trail` or `stack`.

No abbreviations or acronyms in variable names. Write the full word, always.

**Event-handler prefix.** `on*` is reserved for **props** (received from a parent or framework). Locally-defined handler functions inside a component use `handle*`. Reading `<button onClick={handleClick}>` makes it instantly clear which side is the prop and which side is the local function — avoids the read-time confusion of `<button onClick={onClick}>`. Inline arrows (e.g., `onClick={() => setOpen(true)}`) don't need a name and are fine as-is.

**Handler and callback-prop names include the domain noun.** This applies to both `handle*` locals and `on*` props we define. Don't write `handleChange` / `handleReset` / `onNext` / `onSort` — write `handleSearchChange` / `handleFilterReset` / `onNextPage` / `onTableSort`. The call site reads `<EmployeePagination onNextPage={handleNextPage} />` and `<SortableTableHead onTableSort={handleTableSort('name')}>` — both halves self-documenting at a glance. Generic names (`onClick`, `onChange`, `onOpenChange`) are reserved for third-party props (Radix, shadcn, framework) that we can't rename. Exceptions: when the verb already implies the object — `handleOpenChange` (Sheet/Dialog idiom is well-known), `handleSubmit` on a form — the noun is redundant.

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
- **Single line, lowercase, concise.** A comment must fit on one line. If it doesn't, trim it — "concise but clear" wins over "comprehensive." Multi-paragraph rationale belongs in a DEC entry, not the source.
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

## JSDoc on lib exports

Every public export from `src/lib/` (hooks, utility functions, providers) gets a single-line JSDoc above the declaration. Same conciseness rule as `//` comments — one line, lowercase first word, no multi-paragraph rationale. The goal is hover-on-import discoverability, not documentation.

```ts
/** Returns `value` delayed by `delayMs`; resets the timer on every change. */
export function useDebouncedValue<T>(value: T, delayMs: number): T { ... }
```

shadcn UI primitives in `src/components/ui/` already follow this; extend it to `src/lib/`. Type aliases, constants, and React contexts can skip JSDoc when their name is already self-documenting (`FeatureFlagName`, `defaultFeatureFlags`).

## Conditional JSX

Prefer `cond && <X />` over `cond ? <X /> : null` when the condition is non-numeric (string, boolean, object, array). The `&&` form returns the falsy value when the left side is falsy — React renders `null`/`undefined`/`false`/`""` as nothing, but renders `0` and `NaN` as text. So:

- ✅ `{user.name && <Greeting name={user.name} />}` — `name` is `string | null | undefined`, safe.
- ❌ `{items.length && <List items={items} />}` — renders `"0"` when empty. Use ternary or `items.length > 0 && ...`.

When the condition is or could be a number, keep the ternary or coerce explicitly: `cond ? <X /> : null`, `cond > 0 && <X />`, `Boolean(cond) && <X />`.

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
7. **Feature flag gate.** Wrap the entire AI panel in a feature flag check from `lib/feature-flags`. If disabled, render a neutral placeholder, no network call.
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
  name: string // dot-namespaced: 'ai.insights.succeeded'
  timestamp: string // ISO 8601
  sessionId: string // generated once per session, in-memory
  properties?: Record<string, string | number | boolean | null>
}
```

**Events to emit, with reasoning:**

| Event                                                        | Why                                                      |
| ------------------------------------------------------------ | -------------------------------------------------------- |
| `app.session.started`                                        | Denominator for every other rate calculation             |
| `employees.search.changed`                                   | Are filters used? Sample with debounce so we don't flood |
| `employees.filter.changed`                                   | Same — which filters get used?                           |
| `employees.detail.opened`                                    | Engagement with the detail view                          |
| `ai.flag.evaluated`                                          | Confirms flag delivery; denominator for AI rates         |
| `ai.consent.requested` / `.granted` / `.denied`              | Consent funnel; where do users drop off?                 |
| `ai.insights.requested`                                      | Demand for AI feature                                    |
| `ai.insights.succeeded` (with `latencyMs`, `confidence`)     | Success rate, latency, confidence distribution           |
| `ai.insights.low_confidence`                                 | Quality signal — how often is the model unsure?          |
| `ai.insights.pii_filtered`                                   | Safety signal — how often does PII reach our filter?     |
| `ai.insights.timeout` / `.rate_limited` / `.failed`          | Failure modes broken out, never lumped                   |
| `ai.feedback.submitted` (with `rating`)                      | Human-in-the-loop quality signal                         |
| `error.boundary.triggered` (with `boundary`, `errorMessage`) | Where the app crashes                                    |

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

The Faros spec says: _"Write tests where they add value. We'd rather see thoughtful tests for AI content validation than 100% coverage of trivial components."_

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
- New tech decision → append to **Decision Log**. New API quirk → update **API Reference**. New scope clarification → update **Take-home**. New task or status change → update **Sprint / Tasks**.
