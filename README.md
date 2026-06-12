# PICO Cloud

**Option 2: PICO Self-Service Cloud Module** · Abdul Hamid Shuvo · [suvo.me](https://suvo.me)

Small VM console I built for the FGL take-home: pick a plan, provision, pay, use metrics. Mock cloud backend, runs in Docker.

Short on time? Demo 1 (~5 min) in [DEMO.md](DEMO.md). Full walkthrough: [DEMO.md](DEMO.md).

| Doc | Contents |
|-----|----------|
| [DEMO.md](DEMO.md) | Run, accounts, three demos |
| [DESIGN.md](DESIGN.md) | Stack, testing, product strategy |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Diagrams, provision flow |
| [DECISIONS.md](DECISIONS.md) | Tradeoffs and rationale |

---

## 1. What I built

Customers: landing page, signup, login, fixed or custom VMs with live price, simulated provision, VM detail (specs, timeline, IP), invoice + mock pay, metrics locked until paid. Value-before-payment billing with 1-unpaid-VM quota and 7-day payment grace.

Admins: edit unit and package prices in DB, view customers and invoices, suspend and terminate VMs. Admins cannot buy VMs as customers.

PostgreSQL, VM state machine (6 states), CloudProvider mock, Prisma domain enums, 150 tests. More: [ARCHITECTURE.md](ARCHITECTURE.md).

---

## 2. Option selected

Option 2: PICO Self-Service Cloud Module (see header). Maps to VMs, pricing, provision, and billing without over-scoping the take-home.

---

## 3. How to run

```bash
git clone https://github.com/suv0/pico-cloud
cd pico-cloud
docker compose up --build -d
```

Open http://localhost:3080. No `.env` needed. Optional: copy `.env.example` to `.env` to change `PORT` or `SESSION_SECRET` if 3080 is taken. Postgres is available on host port 5433 (user `pico`, password `pico`) for direct DB inspection.

```bash
# Optional: run tests locally (Node 22+, matches Dockerfile)
npm ci
npm test
```

```bash
docker compose logs -f
docker compose down -v
```

Troubleshooting: see **Run it** in [DEMO.md](DEMO.md)

---

## 4. Demo credentials

| Email | Password |
|-------|----------|
| `customer@demo.pico` | `demo1234` |
| `admin@test.com` | `123123123` |

All accounts, signup, test cards: [DEMO.md](DEMO.md) (section **Demo accounts, signup, and test cards**)

---

## 5. Key user flows

1. Customer: login or signup, configure, provision, pay, metrics
2. Admin pricing: edit in `/admin`, customer site updates
3. Failure: name `fail-*`, rename, retry
4. Lifecycle: grace expiry → suspend → pay to restore → resume

Steps: [DEMO.md](DEMO.md)

---

## 6. Architecture overview

```
docker-compose.yml
├── web  (Next.js 15)
└── db   (PostgreSQL 16)
```

Single web container, CloudProvider interface, server-side pricing and RBAC. [ARCHITECTURE.md](ARCHITECTURE.md)

---

## 7. Data model overview

`User`, `Package`, `UnitPrice`, `Resource`, `Invoice`, `AuditEvent`. FSM: PENDING → PROVISIONING → ACTIVE | FAILED, with SUSPENDED and TERMINATED lifecycle states. Schema: `prisma/schema.prisma`. Data model: [ARCHITECTURE.md](ARCHITECTURE.md)

---

## 8. Known limitations

- In-process provisioning (retry after crash via startup recovery; production would use BullMQ)
- Mock metrics and usage
- Simulated payment only
- No signup email verification or dedicated rate limiting (1-VM unpaid quota serves as demo anti-abuse)
- Compose defaults include a demo `SESSION_SECRET` and `NODE_ENV=production` for zero-setup clone and run; override via `.env` in real deploy
- `COOKIE_SECURE=false` in Docker so sessions work over HTTP localhost; production would use HTTPS + secure cookies

---

## 9. What I would improve with more time

1. Job queue for durable provisioning (BullMQ)
2. Rate limiting on auth
3. Email OTP
4. Real OpenStack provider
5. E2E browser tests (Playwright)
6. Cron-based grace enforcement (currently request-driven + startup + demo simulate; 7-day constant hardcoded — production would add admin-configurable grace period)

---

## 10. AI tools used

Cursor IDE with Claude (agent-assisted in-repo). Workflow: spec and design decisions first, vertical slices, agent for boilerplate, human review and tests at every gate.

**Examples where I rejected or corrected AI output:**

- **Prisma enum migration timing** — deferred enum adoption until core flows were stable, then migrated with FSM centralization and tests
- **Separate NestJS backend** — rejected; kept Next.js monolith for Docker simplicity
- **Prepaid billing refactor** — rejected; kept post-provision soft gate (`isPaymentRequired`) to match the provisioning-first demo narrative, with quota and grace as responsible limits

---

## Brief checklist

| Assignment | Verify |
|------------|--------|
| Customer flow | Demo 1 in [DEMO.md](DEMO.md) or `/signup` |
| Packages + pricing | Demo 2 in [DEMO.md](DEMO.md) |
| Provisioning | VM checklist + timeline |
| Billing | `/billing` after active |
| Lifecycle | Grace expiry → suspend → pay → restore (Demo 1b) |
| Mock infra | `lib/cloud/CloudProviderMock.ts` |
| Docker | `docker compose up --build` |
| Tests | `npm ci && npm test` (150) |
