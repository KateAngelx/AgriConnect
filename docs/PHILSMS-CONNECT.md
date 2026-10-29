# Connect PhilSMS to AgriConnect (step-by-step)

You topped up PhilSMS (e.g. ₱50). Complete these steps in order.

---

## Step 1 — PhilSMS dashboard

1. **Developers → API** — copy your **API token** (Bearer token). The API base URL shown there is **`https://dashboard.philsms.com/api/v3/`** (AgriConnect uses this host by default; older docs that mention `app.philsms.com` will return **Unauthenticated** with the same token).
2. **Sender ID** — PhilSMS has announced that the default **`PhilSMS`** sender ID is being **discontinued**. New clients must **register their own Sender ID** (with business documents) **before** topping up. **`PHILSMS_SENDER_ID=PhilSMS`** in `.env.local` only works if your dashboard still lists that SID as active.
3. Confirm **wallet/credits** show balance after your top-up.

### PhilSMS advisory (capstone / academic projects)

PhilSMS states that **Sender ID registration is for legally registered businesses only** — **academic projects, theses, and capstones are not accepted**. Automated API OTP may stay blocked without an approved SID, even with credits and a copied API token.

**Practical paths for AgriConnect defense:**

| Approach | Real SMS? | Setup |
|----------|-----------|--------|
| **`SUPABASE_PHONE_DEV_BYPASS=1`** | No | Local demo; code `123456` in `.env.local` |
| **Supabase test OTP** | No (fixed code) | Dashboard → Phone → test number `639…=123456` |
| **Email registration** | N/A | `/register` → Email tab |
| **Semaphore** (other PH gateway) | Sometimes | See `docs/PH-AFFORDABLE-SMS.md` |
| **PhilSMS + approved business SID** | Yes | Registered business + approved Sender ID only |

For defense/demo, use **dev bypass or email** and note in documentation that **live PH SMS requires a telco-approved Sender ID**, which PhilSMS restricts to registered businesses.

---

## Step 2 — `.env.local`

Add or update (do **not** commit this file):

```env
SUPABASE_PHONE_AUTH_ENABLED=1
SUPABASE_PHONE_DEV_BYPASS=0
PHILSMS_DIRECT_OTP=1
SMS_PROVIDER=philsms
PHILSMS_API_TOKEN=paste_token_here
# PHILSMS_API_BASE=https://dashboard.philsms.com/api/v3
# PHILSMS_SENDER_ID=   (optional)
```

**`PHILSMS_DIRECT_OTP=1`** sends real SMS through PhilSMS from AgriConnect (no Supabase hook required for capstone). Use the Supabase hook later for production.

Restart the dev server: stop and run `pnpm dev` again.

### Fix `Unauthenticated`

1. Confirm requests go to **`https://dashboard.philsms.com/api/v3`** (matches the Developers page). Tokens from that page do **not** work on `app.philsms.com`.
2. PhilSMS → **Developers** → copy the **API token** (not your login password).
3. `.env.local` one line, **no quotes**, no spaces at the end:
   `PHILSMS_API_TOKEN=your_token_from_developers_page`
4. Run `node --env-file=.env.local scripts/validate-philsms-token.mjs` — expect `[OK]`.
5. If it still fails, **regenerate the API token** in the dashboard.

---

## Step 3 — Test PhilSMS only (no Supabase yet)

```powershell
cd "C:\Users\kate angel\Downloads\Agriconnect Project"
node --env-file=.env.local scripts/test-philsms.mjs 09XXXXXXXXX
```

Use **your** mobile number. You should get one test SMS. If this fails, fix PhilSMS before Step 4.

---

## Step 4 — Supabase Send SMS Hook

Supabase generates the OTP; the hook only **texts** the code via PhilSMS.

### Option A — Supabase Edge Function (recommended, no ngrok)

1. Install [Supabase CLI](https://supabase.com/docs/guides/cli) and log in.
2. Link project: `supabase link --project-ref pgbmgbouptewqwofolqv`
3. Set secrets:

```powershell
supabase secrets set PHILSMS_API_TOKEN=your_token PHILSMS_SENDER_ID=YourSender
```

4. Deploy:

```powershell
supabase functions deploy send-sms --no-verify-jwt
```

5. Supabase Dashboard → **Authentication** → **Hooks** → **Send SMS**:
   - **Enable** the hook **first**
   - URL: `https://pgbmgbouptewqwofolqv.supabase.co/functions/v1/send-sms`
   - Copy the **hook secret** Supabase shows
6. Set the same secret in two places:
   - `.env.local` → `SUPABASE_SEND_SMS_HOOK_SECRET=v1,whsec_...`
   - Edge Function: `supabase secrets set SEND_SMS_HOOK_SECRET=v1,whsec_...`
7. **Authentication** → **Providers** → **Phone** → **Enable** → Save (Twilio can stay empty when the hook banner is shown).

### Option B — AgriConnect URL (after Publish / public host)

Hook URL:

`https://YOUR-PUBLIC-SITE/api/hooks/supabase-send-sms`

Put the hook secret in `SUPABASE_SEND_SMS_HOOK_SECRET` only (PhilSMS keys stay in `.env.local` on the server).

For **localhost**, use a tunnel (ngrok) to that path, or use Option A.

---

## Step 5 — Test full phone registration

```powershell
node --env-file=.env.local scripts/test-phone-otp.mjs +639XXXXXXXXX
```

Expect **OTP send: OK** (not `phone_provider_disabled`).

Then in the browser: **Register** → **Phone** → verify page → **Send verification code** → enter the SMS code.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `fetch failed` / `ECONNRESET` | Temporary network or firewall; retry script, disable VPN, try hotspot; `curl.exe -I https://app.philsms.com` |
| `Unauthenticated` | Regenerate API token; no quotes/spaces in `.env.local` |
| `test-philsms` fails | Token, sender ID, or credits; sender not approved |
| OTP send OK but no SMS | Hook URL wrong; check Supabase Auth logs |
| Hook 401 | `SEND_SMS_HOOK_SECRET` mismatch between dashboard and function/env |
| Still dev bypass | Set `SUPABASE_PHONE_DEV_BYPASS=0` and restart dev |

See also: `docs/PH-AFFORDABLE-SMS.md`
