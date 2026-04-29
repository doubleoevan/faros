# Faros AI — Frontend Engineering Take-Home: Employee Insights Dashboard

## Objective

Build an employee management dashboard that integrates AI-powered insights. This exercise evaluates your engineering judgment, product thinking, and ability to build production-grade frontend features — not just whether you can render a table.

You will work with a **mock API server** that simulates real-world conditions: variable latency, occasional errors, and an AI insights endpoint that behaves like a real LLM service. **The server source code is included** — reading it is encouraged and will help you make better decisions.

## Duration

**~8 hours over a weekend.** Spend your time where it matters most. A polished AI integration with solid production thinking is worth more than pixel-perfect styling.

## Setup

### Prerequisites
- Node.js 20+
- npm or yarn
- Your preferred frontend framework (React recommended, but not required)

### Start the mock server

```bash
cd mock-server
npm install
cp .env.example .env    # Review and adjust settings if desired
npm start
```

The server runs at `http://localhost:4000` with these endpoints:

| Endpoint | Description |
|----------|-------------|
| `GET /graphql` | GraphQL endpoint (Apollo Sandbox available in browser) |
| `POST /api/ai/consent` | Obtain a consent token for AI features |
| `GET /api/ai/insights/:employeeId` | AI-generated employee insights (requires consent token) |
| `POST /api/telemetry` | Accepts structured telemetry events |
| `GET /health` | Server health check |

### Assets

Account type icons are provided in `assets/icons/`:
- `github.png` — VCS (GitHub) accounts
- `jira.png` — TMS (Jira) accounts
- `pagerduty.png` — IMS (PagerDuty) accounts
- `google-calendar.png` — Calendar accounts
- `faros-logo.svg` — Faros AI logo

---

## What to build

### Part 1 — Employee Dashboard

Build the employee table view based on the [Figma reference](https://www.figma.com/file/nR9Voet7KCWpOYNJzB4O4Z/Frontend-Engineer-Interview-Exercise%3A-Employees-Page?type=design&node-id=5-3055&mode=design).

**Data comes from the GraphQL API** (not a static JSON file). The API uses cursor-based pagination.

Required features:
- Employee table with columns: Name (with avatar), Tracking Status, Teams, Accounts Connected
- Search by employee name
- Filter by team, tracking status, and account type
- Cursor-based pagination
- "View" button that displays an employee detail panel

The API reflects real-world conditions — you will encounter variability in response times, occasional errors, and data quality issues. How you handle these is part of the evaluation.

**Explore the GraphQL schema** using the Apollo Sandbox at `http://localhost:4000/graphql` to understand available queries, fields, and filter options.

### Part 2 — AI Employee Insights

Add an AI-powered insights feature to the employee detail view.

**Product spec:**

> When viewing an employee, users should be able to see an AI-generated summary of their recent activity. The summary should feel helpful and trustworthy.

That's the full spec. The UX is yours to design. There is no Figma for this part.

The AI insights endpoint is at `GET /api/ai/insights/:employeeId`. It behaves like a real AI service — discover its requirements, capabilities, and limitations as you integrate it. Pay attention to:
- What the API requires before it will respond
- How it behaves under different conditions
- What it returns and whether you should display everything it gives you

### Part 3 — Production Readiness

Make your application production-ready:

- **Telemetry**: Instrument your application with structured telemetry. The mock server provides a `POST /api/telemetry` endpoint that accepts events. Decide what to track and why.
- **Feature flag**: Implement a mechanism to enable/disable the AI insights feature without redeploying.
- **Error boundaries**: Ensure failures in one part of the application don't crash the whole page.
- **Runbook**: Write a `RUNBOOK.md` — a one-page guide for triaging issues with the AI insights feature in production. What would you check? In what order? What metrics would you watch?

### Part 4 — Decision Document

Write a `DECISIONS.md` covering:

1. **Architecture choices** — What framework, state management, and patterns did you choose? What tradeoffs did you consider?
2. **AI development environment and workflow** — Describe your AI-assisted development setup for this project. What tools did you use and how did you configure them? How did you set up your environment to get the best results from AI assistance (e.g., project context, instruction files, custom tools, integrations)? Where did AI output require correction or iteration? What would you change about your workflow for a longer-lived project?
3. **Data and API challenges** — What data quality or API behavior issues did you encounter? How did you handle them?
4. **Privacy and security** — What risks did you identify? What did you do about them?
5. **What you'd do with more time** — If this were going to production, what's missing?
6. **Testing strategy** — How would you test this application in CI? What would you test for AI-generated content specifically?

---

## Submission

Submit a link to a **private GitHub repository** containing:
- Your frontend application source code
- `DECISIONS.md` in the repo root
- `RUNBOOK.md` in the repo root
- A `README.md` with setup and run instructions

**Do not include the mock server in your submission** — we have it. Your repo should document that the mock server must be running at `http://localhost:4000`.

---

## What we evaluate

We evaluate across five dimensions. These apply whether you're interviewing for Senior or Lead — the expected depth scales with the role.

1. **Technical craft** — Implementation quality, error handling, performance, component design, fallback behavior.
2. **AI integration and safety** — How you handle the AI feature: consent, content validation, fallback UX, user feedback, edge cases.
3. **Production and operational thinking** — Telemetry design, feature flags, runbook quality, timeout and retry strategy, degradation behavior.
4. **Product and UX judgment** — The AI UX you design (no Figma provided), human-in-the-loop flows, loading states, accessibility.
5. **Communication and self-awareness** — DECISIONS.md quality, tradeoff reasoning, AI development workflow and environment setup.

---

## FAQ

**Can I use AI coding tools (Claude, ChatGPT, Copilot, etc.)?**
Yes, absolutely — we expect you to. How you use them and how you set up your development environment is part of what we evaluate. Document your approach honestly in DECISIONS.md.

**Can I use component libraries (shadcn, Radix, MUI, etc.)?**
Yes. Use whatever helps you ship quality work.

**Should I write tests?**
Write tests where they add value. We'd rather see thoughtful tests for AI content validation than 100% coverage of trivial components.

**What if the mock server seems broken?**
Read the server source code — the behavior is intentional.

**How closely should I match the Figma?**
The Figma covers Part 1 (the table). Match it pixel-perfect.

**Should I implement authentication?**
No. But you will need to implement consent for the AI feature — that's different from auth.
