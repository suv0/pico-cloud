# Demo guide

Submission sections 1-10 are in [README.md](README.md).

**Short on time?** Demo 1 alone (~5 min) is enough for the main customer flow.

**Quick start:** Use **Login** (not signup) and **Fill customer demo** / **Fill admin demo** on the login page — fastest path to seeded VMs. Signup is optional for empty-state testing.

---

## Run it

Docker and Docker Compose only. No `.env` required.

```bash
git clone https://github.com/suv0/pico-cloud
cd pico-cloud
docker compose up --build -d
```

Open http://localhost:3080 (first build often takes 30-60 seconds).

On startup: migrate, seed demo data, recover stuck provisions, start web on port 3080. Postgres is on host port 5433 if you need it directly.

**Port 3080 already in use?** Copy `.env.example` to `.env`, set `PORT` to a free port (e.g. `3090`), then run compose again. Open http://localhost:3090. Compose reads `.env` automatically; defaults still work if you skip this.

**Stuck?**

```bash
docker compose down -v && docker compose up --build -d
```

That wipes the DB and re-seeds demo accounts.

| Problem | Fix |
|---------|-----|
| Port busy | Set `PORT` in `.env` (see above) or edit `ports` in `docker-compose.yml` |
| Stale data | `docker compose down -v` then up again |
| Slow first start | Wait for the image build |
| Odd UI after DB wipe | Log out once so your session matches the fresh database |

---

## Demo accounts, signup, and test cards

Passwords: customers `demo1234`, admin `123123123`

| Email | Role | Notes |
|-------|------|-------|
| `customer@demo.pico` | Customer | Best for Demo 1 |
| `acme@demo.pico` | Customer | Paid VMs |
| `startup@demo.pico` | Customer | Failed VM for retry demo |
| `labs@demo.pico` | Customer | Mix of paid and unpaid |
| `admin@test.com` | Admin | Pricing console (Demo 2) |

Login page: **Fill customer demo** or **Fill admin demo**.

**Sign up:** optional. Go to `/signup` or **Get started** on the landing page. New accounts start empty (good for empty-state demo). After `docker compose down -v`, demo accounts return but signup users are gone.

**Test cards:** `4242 4242 4242 4242` success · `4000 0000 0000 0002` decline

---

## Demo 1

Buy a VM and pay (~5 min).

1. Log in as `customer@demo.pico` / `demo1234`
2. **Packages** → **Standard** or **Custom Build**
3. Pick region. VM name defaults to `my-web-server`. Click **Provision**
4. Wait for **Active** on the VM page (~45s)
5. **Pay now** with card `4242 4242 4242 4242`
6. **Live** metrics and **Recent usage** unlock. A green "Payment successful" banner appears.

Or use `/signup` and start from step 2.

---

## Demo 1b

Suspend and restore (~3 min). Shows the payment grace lifecycle.

1. After Demo 1, or with any unpaid ACTIVE VM
2. On the VM detail page, click **Simulate 7-day grace expiry**
3. VM transitions to **SUSPENDED** — IP cleared, metrics locked
4. Click **Pay now** with card `4242 4242 4242 4242`
5. VM returns to **ACTIVE** — IP restored, all features unlocked

---

## Demo 2

Admin price change (~3 min). Proves prices load from the DB.

1. Log in as `admin@test.com` / `123123123`
2. **Unit prices** → vCPU **500** to **600** → save
3. Log in as `customer@demo.pico`
4. **Packages → Custom Build → Configure**
5. 2 vCPU / 8 GB RAM / 80 GB SSD → ৳2,800 (was ৳2,600)
6. Refresh `/` → Custom card shows ৳600/core

---

## Demo 3

Failure and retry (~2 min).

1. Provision a VM named `fail-test`
2. Wait for **Failed**
3. Rename (e.g. `recovered-web`) → **Retry provisioning**

Or use seeded `fail-example` on the customer account.

---

## Extras

| Feature | Where |
|---------|--------|
| Signup | `/signup` |
| Status page | `/status` |
| Customer VMs | `/dashboard`, `/resources` |
| Admin | `/admin/customers`, `/admin/invoices` |
| Tests | `npm ci && npm test` (150 tests, Node 22+) |

**Regions:** Dhaka, Chittagong, Sylhet at configure time (stored on VM; mock provision does not vary by region — see [DECISIONS.md](DECISIONS.md), section **Region at provision time**).

**Failure demo:** VM name starting with `fail` triggers mock cloud error.

**UI:** Optimized for desktop review; admin/customer tables scroll horizontally on small screens.
