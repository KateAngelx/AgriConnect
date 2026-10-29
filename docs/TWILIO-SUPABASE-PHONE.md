# Twilio + Supabase phone OTP (AgriConnect)

AgriConnect sends OTP through **Supabase Auth** (`signInWithOtp`). You configure Twilio **inside the Supabase dashboard**, not in AgriConnect code.

Official reference: [Supabase phone login](https://supabase.com/docs/guides/auth/phone-login) · [Twilio provider](https://supabase.com/docs/guides/auth/phone-login/twilio)

---

## Part A — Twilio account

1. Sign up at [twilio.com/try-twilio](https://www.twilio.com/try-twilio).
2. Open [Twilio Console](https://console.twilio.com/).
3. On the home page, copy:
   - **Account SID**
   - **Auth Token** (click to reveal; store securely)

### Option 1 — Twilio Programmable SMS (common for Supabase “Twilio”)

1. Console → **Messaging** → **Services** → **Create Messaging Service**.
2. Add a sender:
   - **Trial:** use the trial number Twilio gives you, or buy a number with **SMS** capability.
   - **Philippines (+63):** trial accounts may **not** send to all countries until you upgrade or complete verification. Check [Twilio SMS geo permissions](https://www.twilio.com/docs/messaging/guides/international-number-sending).
3. Copy the **Messaging Service SID** (starts with `MG...`).

In Supabase (Part B), choose provider **Twilio** and paste:
- Account SID  
- Auth Token  
- Message Service SID  

### Option 2 — Twilio Verify (alternative in Supabase)

1. Console → **Verify** → **Services** → **Create**.
2. Enable **SMS** as a channel.
3. Copy **Verify Service SID** (starts with `VA...`).

In Supabase, choose **Twilio Verify** and paste Account SID, Auth Token, and Verify Service SID.

---

## Part B — Supabase project

1. [Supabase Dashboard](https://supabase.com/dashboard) → your AgriConnect project.
2. **Authentication** → **Sign In / Providers** (or **Providers**).
3. Find **Phone** → turn **Enable Phone provider** ON.
4. **SMS provider:** pick **Twilio** or **Twilio Verify** (match Part A).
5. Paste the SIDs/tokens from Twilio → **Save**.

### URLs (important for local dev)

**Authentication** → **URL configuration**:

| Field | Value (local dev) |
|--------|-------------------|
| Site URL | `http://localhost:3000` |
| Redirect URLs | add `http://localhost:3000/**` |

---

## Part C — AgriConnect `.env.local`

Already required:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_PHONE_AUTH_ENABLED=1
```

Do **not** put Twilio SID/token in AgriConnect — Supabase stores them.

Restart after changes:

```powershell
pnpm dev
```

---

## Part D — Test without paying for SMS (recommended first)

Supabase can use **test phone numbers** with fixed OTP codes (no real SMS is sent).

**Important:** On hosted Supabase, you must still **enable the Phone provider** and **choose an SMS vendor** (e.g. Twilio) with credentials saved. If Phone is off, logs show `POST /auth/v1/otp` **400** with `phone_provider_disabled` / “Unsupported phone provider”, and verify will **403**.

1. **Authentication** → **Sign In / Providers** → **Phone** → **Enable**.
2. Select **Twilio** (or your provider) and save SIDs/tokens (trial Twilio is fine; test numbers do not send SMS).
3. **Authentication** → **Phone** → **Test phone numbers and OTPs** (wording may vary):
   - Add: `639534113831=123456` (must match the number you register, e.g. `09534113831` → `+639534113831`)
   - Set **Test OTPs valid until** to a future date.
4. AgriConnect: **Register** → **Phone** → verify page → **Send verification code** → enter `123456`.

Remove test numbers before production.

Docs: [Phone sign-in — test OTPs](https://supabase.com/docs/guides/auth/phone-login)

---

## Part E — Test with real SMS

1. Register → **Phone** tab → Philippine number `09XXXXXXXXX`.
2. Complete profile → redirected to **Verify phone**.
3. Click **Send verification code** → SMS should arrive within a minute.
4. Enter code → account activates → sign in with **phone + password**.

AgriConnect normalizes `09…` to `+63…` automatically.

---

## Troubleshooting

| Problem | What to check |
|--------|----------------|
| “Phone SMS verification is not enabled” | `SUPABASE_PHONE_AUTH_ENABLED=1` and restart `pnpm dev` |
| Log: `/auth/v1/otp` **400** `phone_provider_disabled` | Enable **Phone** provider + SMS vendor in dashboard (Part B–D) |
| Log: `/auth/v1/verify` **403** | Usually no OTP was issued (fix send first) or wrong/expired code |
| Supabase error on send | Phone provider saved? Twilio credentials correct? |
| SMS never arrives (PH number) | Twilio trial geo limits; upgrade account or use test OTP (Part D) |
| “Wait a minute…” | App rate limit; wait 60s between sends |
| OTP invalid | Code expired (~1 hour default); request new code |
| **400** captcha / request disallowed | Disable CAPTCHA under Bot and Abuse Protection for local dev |

Check **Supabase** → **Authentication** → **Logs** for failed SMS attempts.

Check **Twilio** → **Monitor** → **Logs** → **Errors** for delivery failures.

---

## Part F — Twilio signup blocks your PH number (error `[0x07]`)

That screen is **Twilio securing your Twilio account**, not AgriConnect. Twilio sometimes rejects certain +63 numbers before SMS is sent (trial/geo/carrier rules).

**Options:**

1. **AgriConnect without Twilio:** Register with **Email** on `/register`.
2. **Supabase test OTP** (no real SMS): Still requires Phone + provider enabled in Supabase (Part D).
3. **Another Twilio signup number:** Different active PH SIM, or **voice call** instead of SMS; or a non-PH number you control if Twilio allows it.
4. **Local dev phone flow without SMS** (never production):

```env
SUPABASE_PHONE_AUTH_ENABLED=1
SUPABASE_PHONE_DEV_BYPASS=1
SUPABASE_PHONE_DEV_OTP=123456
```

Restart `pnpm dev`, register with Phone, on verify enter `123456`. Bypass is ignored when `NODE_ENV=production`.

---

## Cost reminder

Twilio trial credit is limited. Each live SMS is billed after trial. Email registration avoids SMS cost until you need phone sign-up.
