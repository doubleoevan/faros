# Employee Insights Dashboard

A production-grade employee management dashboard with AI-powered activity insights, built against a mock GraphQL and REST API.

- [DECISIONS.md](./DECISIONS.md) — architecture choices, AI workflow, tradeoffs
- [RUNBOOK.md](./RUNBOOK.md) — AI insights triage guide for production issues

---

## Prerequisites

- Node.js 20 (`nvm use` picks the version from `.nvmrc`)
- pnpm — `npm install -g pnpm`
- The mock server running at `http://localhost:4000` (see below)

---

## Mock server

The mock server is not part of this repo. It must be running before starting the app.

```bash
cd ../mock-server
npm install
cp .env.example .env
npm start
```

The server listens on `http://localhost:4000` and exposes:

| Endpoint                           | Description                                       |
| ---------------------------------- | ------------------------------------------------- |
| `POST /graphql`                    | GraphQL API (Apollo Sandbox available in browser) |
| `POST /api/ai/consent`             | Issues consent tokens for AI features             |
| `GET /api/ai/insights/:employeeId` | AI-generated activity insights                    |
| `POST /api/telemetry`              | Accepts batched telemetry events                  |
| `GET /health`                      | Health check                                      |

The server deliberately injects chaos: random latency, ~5% GraphQL errors, ~5% AI timeouts, ~15% PII in AI responses, and separate rate limits on GraphQL (60 req/min) and AI (10 req/min). This is intentional — see `RUNBOOK.md` for expected baselines.

---

## Install

```bash
pnpm install
```

---

## Environment

Copy the example file and adjust as needed:

```bash
cp .env.example .env.local
```

| Variable                   | Default                         | Description                                                                                         |
| -------------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------- |
| `VITE_API_URL`             | `http://localhost:4000/graphql` | GraphQL endpoint (AI base URL is derived from this)                                                 |
| `VITE_FEATURE_AI_INSIGHTS` | `true`                          | Enables the AI insights panel; set to `false` to show the neutral placeholder with no network calls |
| `VITE_TELEMETRY_ENABLED`   | `false`                         | `true` flushes events to `/api/telemetry`; `false` logs to console only                             |

---

## Running the app

```bash
pnpm dev
```

Opens at `http://localhost:5173`. The mock server must be running first.

---

## Tests

```bash
pnpm test          # watch mode
pnpm test:run      # run once (used in CI)
pnpm typecheck     # TypeScript — no emit
pnpm lint          # ESLint
```

Run all three checks before committing:

```bash
pnpm typecheck && pnpm lint && pnpm test:run
```

---

## Other commands

```bash
pnpm build         # production build
pnpm codegen       # regenerate src/lib/apollo/generated.ts from the live schema (commit the output)
```

---

## Project structure

```
src/
├── app/                     page-level composition, providers, and root error boundary
├── components/
│   ├── ai/                  InsightsPanel, AiConsentPrompt, AiInsightsErrorFallback, InsightsPlaceholder, LowConfidenceBadge, PiiNotice, InsightsFeedback
│   ├── employees/           EmployeeTable, EmployeeDetailPanel, EmployeeTableErrorFallback, search, filters, pagination
│   └── ui/                  shadcn primitives
└── lib/
    ├── ai/                  fetcher, consent, PII filter, Zod schemas
    ├── apollo/              client, queries, generated types
    ├── feature-flags/       flag context, provider, useFeatureFlag hook
    ├── hooks/               useEmployees, useEmployeeInsights, useAiConsent, useFilterOptions, useDebouncedValue
    ├── telemetry/           events, client (batched flush), session
    └── utils.ts             cn helper
```

Tests are co-located with their source files. `src/test/` holds only shared infrastructure: Vitest setup, a render helper with all providers, and MSW handlers and fixtures.
