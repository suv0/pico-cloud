# DESIGN.md — Architecture, Tradeoffs, and Assumptions

> PICO Cloud · FGL Take-Home Option 2 · Abdul Hamid Shuvo

---

## What I built and why

I wanted a customer to go from "I need a VM" to "it's running and invoiced" without calling anyone — signup, pick a plan, see the price, provision, pay, use metrics. Admin can change prices in the back office and the customer site picks that up from the database. The billing model is value-before-payment: provision first to see the running VM, then pay to unlock console, metrics, and live telemetry — with a 1-unpaid-VM quota and 7-day payment grace as abuse controls.

I kept the scope small enough to finish: one primary workflow, real error states, tenant isolation, audit trail on each VM, and tests on the domain logic.

### Why this stack

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | Next.js 15 + TypeScript | One repo for UI and API; single Docker web container |
| DB | Prisma + PostgreSQL 16 | Users, VMs, invoices, audit — migrations + seed on startup |
| Auth | iron-session + bcrypt | Simple session auth; no JWT refresh machinery |
| Styling | Tailwind + design tokens | Consistent UI without a heavy component library |
| Tests | Vitest | Fast unit and route tests, no browser |
| Deploy | Docker Compose (web + db) | Self-contained; matches brief |

I skipped NestJS and a separate API service — too much surface for one module.

---

## Product strategy: value before payment

### Intent

A customer provisions a VM, watches the checklist complete, sees "ACTIVE" with a public IP and timeline — then pays to unlock console, live metrics, SSE telemetry, and usage history. The provisioning experience itself creates the activation moment; payment is a soft gate on premium features, not a hard gate on the entire product.

### Why not prepaid-only

Prepaid is safer for abuse but weaker for self-service conversion demos. This project chooses to show value before asking for payment, then enforces responsible limits so it isn't an infinite free tier. Production deployments could offer a prepaid SKU for high-trust or enterprise customers — documented here as an architectural alternative.

### Responsible limits

- **1-unpaid-VM quota** — new provisions are blocked (409) when the customer has an unpaid VM that hasn't been terminated
- **7-day payment grace** — unpaid ACTIVE VMs have a `paymentDueAt` date; after expiry, the VM auto-suspends with `publicIp` cleared. The 7-day constant (`lib/billing/constants.ts`) is hardcoded for the demo; production would add an admin panel setting.
- **Admin controls** — admins can suspend or terminate any VM from the admin console
- **Demo simulate** — customers can trigger grace expiry for demo purposes

Paid VMs don't count toward the limit — customers can scale after paying.

### Conversion path

Configure → provision → see ACTIVE + unpaid invoice + due date → pay → fully unlocked

### Architecture note

The MVP FSM commits ACTIVE + invoice creation in a single database transaction. Showing the provisioning checklist before the paywall is the natural demo flow given this architecture. A prepaid model would require changes to the FSM, provision transaction, and UI — documented as a production path in "Tradeoffs and production paths."

---

## Design documentation

| Doc | Contents |
|-----|----------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Deployment diagram, provision flow, data model |
| [DECISIONS.md](DECISIONS.md) | Tradeoffs, production paths |
| [DEMO.md](DEMO.md) | How to run and walk through demos |

---

## Testing approach

150 Vitest tests — run `npm ci && npm test` (Node 22+, no Docker needed, ~35s).

They cover:

- FSM transitions and invalid moves (28 tests, including SUSPENDED and TERMINATED lifecycle states)
- Pricing math
- Mock cloud success/failure and progress order
- Admin RBAC (401/403)
- Payment gates (402 on unpaid metrics/usage, including SUSPENDED)
- Payment required logic (SUSPENDED treated like ACTIVE for billing gates)
- Startup recovery for interrupted provisions
- Invoice pay and concurrent pay edge cases

FSM, estimator, and cloud provider are pure or injected — easy to test without HTTP. Deeper list: see test files under `tests/`.

---

## Tradeoffs and production paths

- **Prepaid billing** — production alternative to value-before-payment; would restructure FSM to capture payment before provisioning starts
- **Cron-based grace enforcement** — currently request-driven + startup batch + demo simulate; production would add a cron worker
- **Job queue** — BullMQ for durable provisioning; only `provisionService` changes

---

## Assumptions

1. Showing monthly price at configure time satisfies "pricing / estimate" — server recalculates at provision.
2. "Simulated provisioning" means async delay, success/failure, IP assignment — not an instant flag flip.
3. "Mocked infrastructure API" means a swappable provider interface — not necessarily a fake HTTP server.
4. Simple email + password auth fits the brief's guidance.
5. BDT fits FGL's Bangladesh context.
6. Value-before-payment billing with quota+grace is a deliberate product choice, not an oversight.

---

*Abdul Hamid Shuvo — June 2026*
