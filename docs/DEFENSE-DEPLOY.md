# Capstone defense on the **published** site

Use your **deployed URL** (Figma Make **Publish** / production host), not only `localhost`, for panel defense. The floating AI assistant and orders/delivery features work the same when env vars and Supabase are configured on the host.

---

## Recommended for defense (no OpenAI billing)

You do **not** need paid OpenAI credits. The assistant uses **live AgriConnect data** (products, seller price compare, courier job order, application screening).

### Published app environment variables

In **Figma Make → your file → Environment variables** (same place as Supabase keys), set:

| Variable | Value for defense |
|----------|-------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server only) |
| `SUPABASE_PHONE_AUTH_ENABLED` | `0` |
| `OPENAI_FORCE_DATABASE` | `1` |
| `OPENAI_API_KEY` | **Leave empty** or omit (optional if you add credits later) |

Do **not** set `SUPABASE_PHONE_DEV_BYPASS=1` on production (local demo only).

**Publish** again after changing env vars so the runtime picks them up.

### Supabase before demo

1. Run `supabase/schema.sql`, migrations (`004_geo_pins.sql`, `005_order_eta_pickup.sql`), and `seed.sql` on the **same** project linked to the deployed app.
2. Confirm demo logins work on the **published** URL:
   - `buyer@agriconnect.ph` / `password1`
   - `seller@agriconnect.ph` / `password1`
   - `delivery@agriconnect.ph` / `password1`
   - `admin@agriconnect.ph` / `password1`

---

## What to demo on the live URL

1. **Buyer** — marketplace → cart → checkout **delivery pin** → ETA → order detail map.
2. **Floating AI** (bottom-right) — “Compare tomato prices across sellers.”
3. **Seller** — confirm/prepare orders; AI price compare on inventory page.
4. **Courier** — share location in AI → nearest open jobs; accept → route map.
5. **Admin** — applications → **AI eligibility assist** (rule-based on deploy).

Say in your script: *“AI is grounded in our database; OpenAI is optional for wording. Production uses data mode for reliability and cost.”*

---

## Optional: OpenAI on production later

Only if you add billing credits:

1. Set `OPENAI_API_KEY` and `OPENAI_MODEL=gpt-4o-mini` in the **published** environment.
2. Set `OPENAI_FORCE_DATABASE=0` or remove it.
3. Republish.

If credits run out, the app **falls back** to data mode automatically (no blank errors).

---

## Verify before defense day

```powershell
pnpm run build
figma make verify-deploy
```

Open the **published** route table URL from verify output and test login + one AI question on the live host.

Local parity: keep the same flags in `.env.local` (`OPENAI_FORCE_DATABASE=1`, Supabase keys, phone auth off).
