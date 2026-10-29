# AgriConnect — make the system work (checklist)

Use this in order. Check items off as you go. **Dev/staging only** — do not run destructive tests on production.

---

## Phase A — One-time Supabase setup

| # | Task | How |
|---|------|-----|
| A1 | [ ] Supabase project exists | [supabase.com](https://supabase.com) → your AgriConnect project |
| A2 | [ ] Run base schema | Supabase → **SQL** → New query → paste & run `supabase/schema.sql` |
| A3 | [ ] Run seed data (recommended) | Same SQL editor → run `supabase/seed.sql` |
| A4 | [ ] Run phone migration | Run `supabase/migrations/002_phone_profiles.sql` |
| A5 | [ ] Fix service role access | Run `supabase/migrations/003_service_role_grants.sql` (fixes “permission denied for table profiles”) |
| A6 | [ ] Map pins migration | Run `supabase/migrations/004_geo_pins.sql` (pickup/delivery pins + demo seller coords) |
| A7 | [ ] Copy API keys to app | Project **Settings → API** → into `.env.local` (see `.env.example`) |

Required in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   ← must be **service_role** (secret), not anon
```

Optional (add when ready):

```env
SUPABASE_PHONE_AUTH_ENABLED=0
PAYMONGO_SECRET_KEY=
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
OPENAI_FORCE_DATABASE=0
```

---

## Phase A2 — OpenAI assistant (optional)

**Full steps:** see **`docs/OPENAI-SETUP.md`** (Path A = OpenAI + credits, Path B = defense without billing).

| # | Task | How |
|---|------|-----|
| O1 | [ ] Choose path | Path A: billing + key · Path B: `OPENAI_FORCE_DATABASE=1` only |
| O2 | [ ] Edit `.env.local` | Per OPENAI-SETUP Step 2 or Path B |
| O3 | [ ] Test CLI | `node --env-file=.env.local scripts/test-openai.mjs` |
| O4 | [ ] Test in app | Admin → Platform settings → **Test OpenAI connection** |
| O5 | [ ] Published site | Same vars in Figma Make env → **Publish** |

---

## Phase B — Verify from your PC

Run in the project folder (PowerShell):

```powershell
cd "C:\Users\kate angel\Downloads\Agriconnect Project"
node --env-file=.env.local scripts/verify-setup.mjs
```

| # | Task | Command / action |
|---|------|------------------|
| B1 | [ ] Verify script passes | `node --env-file=.env.local scripts/verify-setup.mjs` → no `[XX]` lines |
| B2 | [ ] Backfill roles (safe to rerun) | `node --env-file=.env.local scripts/backfill-profile-roles.mjs` |
| B3 | [ ] Clean build | `pnpm run build` |
| B4 | [ ] Start dev server | Delete `.next` if you had 500 errors, then `pnpm dev` → open http://localhost:3000 |

---

## Phase C — Smoke test (manual, ~15 min)

| # | Test | Expected |
|---|------|----------|
| C1 | [ ] Home + `/products` load | Products list (from seed or your data) |
| C2 | [ ] Register with **email** | Login works |
| C3 | [ ] Add to cart → `/checkout` | Each seller shows **farm name + pickup location** |
| C4 | [ ] Place **pickup** order | Buyer order page shows readable progress labels |
| C5 | [ ] Place **delivery** order (if products allow delivery) | Delivery fee on order; courier sees **area only** until accept |
| C6 | [ ] Seller login (seed seller) | Advance order status; buyer gets notification |
| C7 | [ ] Delivery login (seed courier) | Accept assignment → full address visible |
| C8 | [ ] Admin `/admin/applications` | Approve/reject; optional AI assist button |
| C9 | [ ] Marketplace assistant on `/products` | Answer or clear “set OPENAI_API_KEY” message |

Full list: `tests/e2e-checklist.md`

---

## Phase D — Optional integrations

| Feature | When you need it | What to do |
|---------|------------------|------------|
| Phone register + OTP | Farmers without email | Supabase **Authentication → Phone** + SMS provider (Twilio, etc.) → set `SUPABASE_PHONE_AUTH_ENABLED=1` |
| Card / GCash checkout | Online payment | PayMongo dashboard → `PAYMONGO_SECRET_KEY` |
| AI assistant | Product compare help | OpenAI → `OPENAI_API_KEY` |
| Palengke price compare | Not available yet | No verified feed — assistant will say so |

---

## Phase E — If something breaks

| Symptom | Fix |
|---------|-----|
| 500 / missing old paths | Stop dev, delete `.next`, `pnpm dev` again |
| “Database is empty” | Run `seed.sql` |
| “column phone does not exist” | Run `002_phone_profiles.sql` |
| Phone registration error | Use email, or complete Phase D phone row |
| Cart/checkout redirects | Sign in with an **approved buyer** account |

---

## Quick reference — seed logins

After `seed.sql`, all demo accounts use password **`password1`**:

| Role | Email |
|------|--------|
| Buyer | `buyer@agriconnect.ph` |
| Seller | `seller@agriconnect.ph` |
| Delivery | `delivery@agriconnect.ph` |
| Admin | `admin@agriconnect.ph` |

Change passwords before any public deployment.
