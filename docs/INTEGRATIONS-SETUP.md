# AgriConnect integrations setup

**Never commit API keys.** Add values only in `.env.local` (server-side variables). Do not paste secrets into chat.

---

## 1. AI assistant (local + **published** defense)

**Step-by-step guide:** **`docs/OPENAI-SETUP.md`** (local + Figma Make + admin test button).

**Capstone without billing:** Path B in that doc — `OPENAI_FORCE_DATABASE=1`.

**Full OpenAI:** Path A — API key, credits, `OPENAI_FORCE_DATABASE=0`, then `scripts/test-openai.mjs`.

If credits run out, routes fall back to database answers on both localhost and production.

---

## 2. PayMongo (GCash, Maya, card)

1. Sign up at [paymongo.com](https://www.paymongo.com/) → **Developers** → create a **secret key** (test mode first).
2. In `.env.local`:

```env
PAYMONGO_SECRET_KEY=sk_test_...
```

3. Restart `pnpm dev`.
4. Test: checkout → choose **Online (GCash, Maya, card)** → place order → PayMongo checkout URL.

Cash checkout works without PayMongo.

---

## 3. Phone OTP (Supabase SMS)

### A. Supabase dashboard

1. [Supabase Dashboard](https://supabase.com/dashboard) → your project → **Authentication** → **Providers** → **Phone** → Enable.
2. Under **SMS provider**, connect **Twilio** (or MessageBird / Vonage as supported):
   - Twilio: Account SID, Auth Token, and a **Messaging**-capable sender (phone number or Messaging Service SID).
3. Set **Site URL** under Authentication → URL configuration to your app URL (e.g. `http://localhost:3000` for dev).

### B. App environment

Already enabled in `.env.local`:

```env
SUPABASE_PHONE_AUTH_ENABLED=1
```

4. Restart `pnpm dev`.
5. Test: **Register** → **Phone** tab → complete flow → `/register/verify-phone` → SMS code → sign in with phone + password.

If SMS is not configured in Supabase, phone registration shows an explicit error (email registration still works).

**Note:** Auth OTP uses **Supabase Auth SMS**, not a custom iProG route. Use iProG later only for **order notification** SMS if you add that integration separately.

### Affordable real SMS (~₱100, all PH networks)

**Recommended:** [Semaphore](https://semaphore.co/) and/or [PhilSMS](https://philsms.com/) through AgriConnect’s **Send SMS Hook** (no Twilio). ~₱0.35–0.56 per OTP → **~180–280 verifications per ₱100**. Delivers to Globe, Smart, DITO, etc.

Full setup: **`docs/PH-AFFORDABLE-SMS.md`**

| Option | Cost | Best for |
|--------|------|----------|
| **PH SMS hook (Semaphore/PhilSMS)** | ~₱100 prepaid | Real +63 OTP for capstone/demo |
| **Supabase test OTP** | Free | Fixed code, no SMS |
| **`SUPABASE_PHONE_DEV_BYPASS`** | Free | Local dev only |
| **Email registration** | Free | No SMS at all |

---

## 4. Seller pickup pin (`seller@agriconnect.ph`)

1. Run in Supabase SQL editor (if not done): `supabase/migrations/004_geo_pins.sql`
2. Or run locally:

```powershell
node --env-file=.env.local scripts/seed-seller-pins.mjs
```

3. Sign in as **seller@agriconnect.ph** / **password1** → **Shop settings** → adjust pin on the map → **Save profile**.
4. Verify: open a product from **Laguna Greens** → map shows pickup pin.

---

## Verify everything

```powershell
node --env-file=.env.local scripts/verify-setup.mjs
```

Expected when fully configured:

- `[OK] PayMongo`
- `[OK] OpenAI`
- `[OK] Phone OTP`
