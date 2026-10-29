# Google AI Studio (Gemini) — AgriConnect setup

Use **Google AI Studio** for a **free-tier** Gemini API on localhost and your **published** Figma Make site.

---

## Step 1 — Create an API key

1. Open [Google AI Studio](https://aistudio.google.com/apikey).
2. Sign in with your Google account.
3. Click **Create API key** (choose an existing Google Cloud project or create one).
4. Copy the key (starts with `AIza…`). Store it only in server env — never in git or the browser.

---

## Step 2 — Local environment (`.env.local`)

Add or update:

```env
AI_PROVIDER=gemini
GEMINI_API_KEY=AIza_your_key_here
AI_MODEL=gemini-3.5-flash-lite
OPENAI_FORCE_DATABASE=0
```

| Variable | Notes |
|----------|--------|
| `AI_PROVIDER=gemini` | Required so Groq/OpenAI keys are not picked first |
| `GEMINI_API_KEY` | From AI Studio (aliases: `GOOGLE_AI_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`) |
| `AI_MODEL` | **New keys (2026):** use `gemini-3.5-flash-lite` or `gemini-3.5-flash`. Older names like `gemini-2.0-flash` often return **404**. The app auto-tries fallbacks if one model is busy (**503**). |
| `OPENAI_FORCE_DATABASE=0` | Must be `0` to call Gemini |

No quotes around the key. Restart **`pnpm dev`**.

---

## Step 3 — Test locally

```powershell
cd "C:\Users\kate angel\Downloads\Agriconnect Project"
node --env-file=.env.local scripts/test-ai.mjs
```

Expected: `[OK] Gemini connected.`

In the app: **admin@agriconnect.ph** / **password1** → **Admin → Platform settings** → **AI assistant** → **Test AI connection**.

Use the **floating AI** (bottom-right) and ask a marketplace question.

---

## Step 4 — Published / deployed site (Figma Make)

1. Figma Make → your AgriConnect file → **Environment variables**.
2. Add the **same four variables** as Step 2.
3. Keep Supabase keys configured.
4. **Publish** again (env changes apply after publish).
5. On the **live URL**, repeat the admin connection test and floating assistant.

---

## Step 5 — Free tier limits

Google’s free tier has **daily and per-minute quotas**. If Gemini returns 429 or quota errors, AgriConnect **automatically falls back** to live database answers (products, delivery jobs, applications).

For defense with zero external API risk, use **`OPENAI_FORCE_DATABASE=1`** instead (see `docs/DEFENSE-DEPLOY.md`).

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Still “database only” | Set `OPENAI_FORCE_DATABASE=0`, restart dev / republish |
| Wrong provider | Set `AI_PROVIDER=gemini` explicitly |
| 400 model not found | Try `AI_MODEL=gemini-1.5-flash` |
| 403 API key | Regenerate key in AI Studio; enable Generative Language API for the project |
| Empty response | Prompt may be blocked; fallback still works |

---

## What uses Gemini

Same as other providers: floating **AI assistant** (`/api/ai/chat`) for buyer, seller, courier, and admin — always combined with live AgriConnect JSON facts.
