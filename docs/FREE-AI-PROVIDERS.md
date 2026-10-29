# Free AI for deployed AgriConnect

You have **three practical options** for a **published** (Figma Make) site:

| Option | Cost | Best for |
|--------|------|----------|
| **A. Database mode** | Free forever | Capstone defense — no external LLM |
| **B. Groq** | Free tier with limits | Deployed demo with natural language |
| **C. Google Gemini** | Free tier (AI Studio) | Deployed demo, Google account |
| **D. OpenRouter** | Some free models | Fallback if Groq/Gemini limits hit |

AgriConnect always **falls back to live marketplace/delivery/admin data** if the LLM fails.

---

## Option A — Database mode (already working)

Your test showed:

`[OK] Database-only mode (OPENAI_FORCE_DATABASE=1)`

No API key needed. Set on **published** env:

```env
OPENAI_FORCE_DATABASE=1
```

Floating assistant uses real product, order, and application data.

---

## Option B — Groq (recommended free LLM for deploy)

Groq offers a **free API tier** (rate limits apply). It uses the same chat format as OpenAI.

### Step 1 — Groq account

1. Go to [console.groq.com](https://console.groq.com)
2. Sign up / sign in
3. **API Keys** → **Create API Key** → copy (`gsk_…`)

### Step 2 — Environment (local + published)

In **`.env.local`** and **Figma Make → Environment variables**:

```env
AI_PROVIDER=groq
GROQ_API_KEY=gsk_your_key_here
AI_MODEL=llama-3.1-8b-instant
OPENAI_FORCE_DATABASE=0
```

Do **not** set `OPENAI_API_KEY` unless you also use OpenAI.  
Remove quotes from keys. **Publish** after changing Make env vars.

Other Groq models you can try: `llama-3.3-70b-versatile`, `gemma2-9b-it` (check Groq docs for current free list).

### Step 3 — Test

```powershell
cd "C:\Users\kate angel\Downloads\Agriconnect Project"
node --env-file=.env.local scripts/test-ai.mjs
```

Restart `pnpm dev`. Admin → **Platform settings** → **Test OpenAI connection** (tests whichever provider is configured).

### Step 4 — Deploy

Same four variables on the **published** site → **Publish** → test floating AI on the live URL.

---

## Option C — Google AI Studio / Gemini (free tier)

**Full steps:** **`docs/GEMINI-AI-STUDIO-SETUP.md`**

Quick env:

```env
AI_PROVIDER=gemini
GEMINI_API_KEY=AIza...
AI_MODEL=gemini-3.5-flash-lite
OPENAI_FORCE_DATABASE=0
```

Test: `node --env-file=.env.local scripts/test-ai.mjs` → Publish on Make with the same vars.

---

## Option D — OpenRouter (free models)

1. [openrouter.ai](https://openrouter.ai) → account → API key
2. Env:

```env
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=sk-or-...
AI_MODEL=google/gemma-2-9b-it:free
OPENROUTER_SITE_URL=https://your-published-site.url
OPENROUTER_APP_NAME=AgriConnect
OPENAI_FORCE_DATABASE=0
```

Free models change over time — pick a `:free` model from their model list.

---

## Variable reference

| Variable | Purpose |
|----------|---------|
| `AI_PROVIDER` | `groq` \| `gemini` \| `openrouter` \| `openai` |
| `AI_MODEL` | Model id for that provider |
| `GROQ_API_KEY` | Groq |
| `GEMINI_API_KEY` | Google Gemini |
| `OPENROUTER_API_KEY` | OpenRouter |
| `OPENAI_API_KEY` | OpenAI (paid credits) |
| `OPENAI_FORCE_DATABASE=1` | Skip all LLMs — data only |

If `AI_PROVIDER` is empty, the app picks the first key it finds (Groq → OpenRouter → Gemini → OpenAI).

---

## What to say in defense

> “We support multiple LLM providers (Groq, Gemini, OpenAI) with **grounded data** from Supabase. Production can run **database mode** at zero cost, or **Groq free tier** for natural language on the deployed site.”

See also: `docs/OPENAI-SETUP.md`, `docs/DEFENSE-DEPLOY.md`.
