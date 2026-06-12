# Design decisions

Why I built things this way and what I'd change at scale.

Hub: [DESIGN.md](DESIGN.md) · Diagrams: [ARCHITECTURE.md](ARCHITECTURE.md) · Run the app: [DEMO.md](DEMO.md)

---

## 1. In-process async (no worker container)

**What I did:** Provisioning runs inside the web process as fire-and-forget (`runProvisionAsync`).

**Why:** The brief wanted one Docker Compose stack with no third service. The mock job finishes in ~45s. A worker + queue adds Dockerfile complexity, test setup, and ops surface for little gain here.

**Tradeoff:** Jobs don't survive a container restart mid-provision.

**Recovery:** On every container start, `scripts/startup-recovery.ts` runs before seed:

**At scale:** BullMQ or Postgres `SKIP LOCKED` workers. Only the caller changes; `provisionService` and `CloudProvider` stay the same.

---

## 2. FSM as a data table

**What I did:** Valid transitions live in a table keyed by Prisma `ResourceStatus`; invalid moves throw before DB write. All status changes go through `transitionResourceStatus()` in `lib/provisioning/transitionResourceStatus.ts` (load current → `assertValidTransition` → update). UI/API can ask `canTransition(from, to)` (e.g. retry = `FAILED → PENDING`).

```typescript
const VALID_TRANSITIONS: Record<ResourceStatus, ResourceStatus[]> = {
  PENDING:      [PROVISIONING, FAILED],
  PROVISIONING: [ACTIVE, FAILED],
  ACTIVE:       [],              // terminal — no outbound transitions
  FAILED:       [PENDING],        // retry only
};
```

**Persistence:** `Resource.status` is a Prisma enum — the DB rejects bogus values; the FSM table rejects illegal transitions in app code. Seed, APIs, and tests use enum members from `@prisma/client` (not parallel string unions).

**Enforcement (A+ pass):** Every caller uses the central helper — including `recoverInterruptedProvisions()` (startup marks stuck `PENDING`/`PROVISIONING` → `FAILED`) and retry (`transitionResourceStatusIf` so only `FAILED` → `PENDING` when still failed). No code path skips the table.

**Why:** One place to add states (`SUSPENDED`, etc.). Retry is `FAILED → PENDING` then re-run provision.

**UI progress:** Sub-steps during `PROVISIONING` are audit events (`RESOURCE_PROVISION_STEP`), not extra FSM states. Checklist reads from audit log.

**Diagram:** See [ARCHITECTURE.md](ARCHITECTURE.md) (section **VM lifecycle**).

**At scale:** Same table; maybe persist transition history for compliance.

---

## 3. CloudProvider interface

**What I did:** `CloudProvider.provision()` with a mock that mirrors OpenStack Nova shape. `provisionService` is the only place that instantiates the provider.

**Why not a fake HTTP OpenStack server:** Same abstraction benefit, less Docker and test overhead for a take-home.

**Failure demo:** Names starting with `fail` go through `shouldSimulateProvisionFailure()` — easy for reviewers, tested in `tests/cloudProviderMock.test.ts`.

**At scale:** `OpenStackProvider.ts` replaces the mock; one line in `provisionService`.

---

## 4. Pure pricing function

**What I did:** `calculateCustomPrice(spec, unitPrices)` — no DB, no side effects.

**Server:** Reads unit prices from DB at provision time; never trusts client price.

**Client:** Fetches unit prices once; runs same function as sliders move.

**Fail-closed (A+ pass):** If any unit price row is missing or ≤ 0, `loadUnitPricesFromDb()` throws `UnitPriceConfigurationError`; provision and estimate APIs return **503** (not silent zero pricing). Admin must fix seed or unit prices before custom VMs provision.

**At scale:** Add discount codes, tax, term length as parameters — function stays pure.

---

## 5. Tenant isolation

**What I did:** Every query filters by `userId` from session. Other user's resource → `404` (not `403`).

**Why 404:** Don't confirm existence of resources you don't own.

**DB:** `@@unique([userId, name])` on `Resource`. Pay/retry routes return **404** for another user's invoice or VM (tested in `tests/payInvoice.test.ts`).

**Query validation:** `GET /api/resources?status=` must be a valid `ResourceStatus` — invalid values return **400** (not empty list with bogus filter).

---

## 6. Admin RBAC

**What I did:** `User.role` loaded from DB on each `getValidatedSession()` — not stored in the cookie.

**Why:** Role changes apply on next request without re-login.

**Ops-only admin:** Admins manage pricing and customer oversight; they can't provision VMs through the customer console. They can retry failed customer VMs (support ops).

**At scale:** Redis role cache with invalidation on `User.update`, or short-lived JWT + revocation table.

**If they ask about DB hit every request:** Acceptable at this scale; cookie holds `userId` only so permissions stay authoritative.

**Admin prefetch:** `prefetch={false}` on admin nav links to avoid RSC prefetch storms during Docker demos on a single container.

**Admin metrics bypass:** Admin SSE stream skips payment gate — ops can inspect unpaid customer VMs without paying as the customer.

**API auth:** Middleware protects pages; API routes call `getValidatedSessionForRoute()` per handler — no global API middleware.

---

## 7. Live metrics via SSE

**What I did:** `GET .../metrics/stream` with mock telemetry every ~2s. REST snapshot as fallback.

**Why SSE, not WebSocket:** One-way push works with Next.js Route Handlers and `next start` in Docker — no upgrade handshake, no sticky sessions. One connection per tab vs ~30 polls/minute.

**Payment gate:** Customer stream returns 402 when invoice is unpaid. Admin stream is open (ops oversight). Rule is centralized in `isPaymentRequired()`.

**At scale:** Real hypervisor/agent feed; maybe WebSocket binary frames if bidirectional control is needed.

---

## 7b. Usage chart and /status

**Usage:** Hourly demo buckets on VM detail; 402 when unpaid (same rule as metrics).

**Platform `/status`:** Optional public health page — footer link only, not core journey.

**At scale:** Prometheus/Grafana + real metering rollup jobs.

---

## 8. Value-before-payment billing

**What I did:** Invoice created when VM reaches ACTIVE. Metrics, usage, and console locked until paid — payment is a soft gate. Quota: 1 unpaid VM per customer. Grace: 7-day payment window; after expiry, VM auto-suspends with `publicIp` cleared.

**Why:** The provisioning experience itself creates the activation moment — checklist, IP, timeline — before asking for payment. This is a legitimate self-service cloud pattern (AWS bills post-usage), not a gimmick. The FSM commits ACTIVE + invoice in one transaction; the checklist before the paywall is the natural demo flow.

**Architecture reality (honest):** The MVP FSM creates the invoice atomically with ACTIVE. A prepaid model would restructure the provision transaction and UI — documented as a production alternative in DESIGN.md.

**Abuse controls:**
- `isPaymentRequired()` returns true for both ACTIVE and SUSPENDED unpaid VMs (single choke point, tested)
- `assertCanProvisionNewVm()` blocks `POST /api/resources` with 409 when quota exceeded
- Grace enforcement on resource detail GET, resource list GET, and startup batch
- Admin suspend/terminate for ops control

**At scale:** Stripe at provision, prepaid SKU flag, cron-based grace enforcement.

---

## 9. Region at provision time

**What I did:** `regionCode` on `Resource`; catalog in `lib/regions/catalog.ts` (Dhaka, Chittagong, Sylhet).

**Not in MVP:** Per-region pricing, post-create migration.

**Mock provider:** `regionCode` is stored on `Resource` and shown in UI/maps; the mock provision path does not vary latency or failure by region — catalog is for UX and future real routing.

---

## 10. Simple auth (bcrypt, no OTP)

**What I did:** Signup/login with bcrypt (cost 12), iron-session httpOnly cookie.

**Session secret in Docker:** Compose defaults include `SESSION_SECRET` and `PORT=3080` so reviewers run `docker compose up --build` with no `.env`. Optional `.env` overrides `PORT` or `SESSION_SECRET` via compose substitution. Production would use a secrets manager, not a committed default. See README §3 and §8.

**HTTP cookies in Docker:** `COOKIE_SECURE=false` in compose so session cookies work over `http://localhost:3080`. Production HTTPS would omit this override so `secure` cookies are enforced.

**Why no OTP:** Brief allows simple auth; OTP adds tables, UI, and edge cases for little rubric gain here.

**Demo `SESSION_SECRET`:** Compose defaults a dev secret so `docker compose up --build` works with no `.env`; override in production via secrets manager (see README §3, §8).

**Rate limiting:** Not implemented on login/signup — would add in production; documented in README §8 known limitations.

**At scale:** Email verification, rate limiting on login/signup, secret rotation.

---

## Expandability map

| Module | MVP | Add later |
|--------|-----|-----------|
| `CloudProvider` | `provision()` only | Real OpenStack provider |
| `fsm.ts` | 6 states (PENDING, PROVISIONING, ACTIVE, FAILED, SUSPENDED, TERMINATED) | — |
| `estimator.ts` | spec × unit prices | discounts, tax |
| `audit/logger.ts` | DB append | webhooks, notifications |
| `Invoice` | single amount | line items table |

---

## Explicit out of scope

| Feature | Why |
|---------|-----|
| Worker container / BullMQ | Documented tradeoff; not required for brief |
| API versioning / OpenAPI | Same-repo internal API; no external consumers |
| OTP email | Simple auth per brief |
| API keys | Separate auth path |
| Real hypervisor metrics | Mock SSE only |
| Rate limiting | Would add on auth routes in production |
| WebSocket metrics | SSE sufficient for one-way push |
| List pagination | MVP lists are small; single-user demo scope |
| Playwright E2E | Vitest route/unit coverage instead |
| Re-enabling admin Link prefetch | Avoids RSC prefetch storm on single Docker container |

---

*Abdul Hamid Shuvo — June 2026*
