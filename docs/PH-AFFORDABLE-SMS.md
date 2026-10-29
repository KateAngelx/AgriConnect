# Affordable PH SMS for phone OTP (~₱100 budget)

AgriConnect can send Supabase Auth OTPs through **Philippine SMS gateways** that reach **Globe, Smart, DITO, TNT, Sun**, etc.—without Twilio.

**Typical cost (2025):**

| Provider | About per OTP | ₱100 gets roughly |
|----------|----------------|-------------------|
| [PhilSMS](https://philsms.com/) | ~₱0.35–0.50 | **200–285** OTPs |
| [Semaphore](https://semaphore.co/) | ~₱0.56 (incl. VAT) | **~178** OTPs |

Use **one** provider for capstone; configure **both** in `.env.local` and set `SMS_PROVIDER=auto` to try Semaphore first, then PhilSMS if the first fails.

---

## 1. Create an account (pick one or both)

### Semaphore

1. Sign up at [semaphore.co](https://semaphore.co/).
2. Top up **₱100** (or minimum load).
3. Register a **Sender Name** (e.g. `AgriConnect`) in the dashboard (approval can take a short time).
4. Copy your **API key**.

### PhilSMS

1. Sign up at [philsms.com](https://philsms.com/) → get **API token** from the dashboard.
2. Register **Sender ID** (max 11 characters, e.g. `AgriConnect`).
3. Top up prepaid credits.

---

## 2. App environment (`.env.local`)

```env
SUPABASE_PHONE_AUTH_ENABLED=1
# Turn off local bypass when using real SMS:
# SUPABASE_PHONE_DEV_BYPASS=0

SMS_PROVIDER=auto
SEMAPHORE_API_KEY=
SEMAPHORE_SENDER_NAME=AgriConnect
PHILSMS_API_TOKEN=
PHILSMS_SENDER_ID=AgriCon

# From Supabase → Authentication → Hooks → Send SMS
SUPABASE_SEND_SMS_HOOK_SECRET=v1,whsec_...
```

Restart `pnpm dev` after changes.

---

## 3. Supabase Send SMS Hook

Supabase still **generates and verifies** the OTP; your hook only **delivers** the SMS (no Twilio account needed).

1. Deploy AgriConnect so the hook URL is public (Figma Publish or your host):

   `https://YOUR-DOMAIN/api/hooks/supabase-send-sms`

   For local testing, use a tunnel (e.g. ngrok) to the same path.

2. Supabase Dashboard → **Authentication** → **Hooks** → **Send SMS** → **Enable**.
3. Paste the hook URL and copy the **secret** into `SUPABASE_SEND_SMS_HOOK_SECRET`.
4. **Enable Send SMS Hook first**, then **Authentication → Providers → Phone** → enable Phone (Twilio fields can stay empty when the hook banner says they are disabled).
5. Save.

Flow: Register → Phone → AgriConnect calls `signInWithOtp` → Supabase calls your hook → Semaphore/PhilSMS texts the code → user enters code on `/register/verify-phone`.

---

## 4. Test

```powershell
node --env-file=.env.local scripts/test-phone-otp.mjs +639534113831
```

After the hook is live, this should return **OTP send: OK** (no `phone_provider_disabled`).

---

## 5. Keep costs down

- Use **test OTP** or **dev bypass** during development (`docs/TWILIO-SUPABASE-PHONE.md`).
- Supabase rate limit: 1 OTP / 60s per number (matches the app).
- Do not spam the same number while testing (carriers may temporarily block).

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Hook 401 | Wrong `SUPABASE_SEND_SMS_HOOK_SECRET` |
| Hook 502 | Check Semaphore/PhilSMS balance, sender name approved, API keys |
| Semaphore ignores message | Do not start SMS body with the word `TEST` |
| Still `phone_provider_disabled` | Enable **Phone** provider in Supabase (with SMS hook enabled) |
