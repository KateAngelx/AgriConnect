# Step-by-step: OpenAI setup for AgriConnect

**Free alternatives (Groq, Gemini, OpenRouter):** see **`docs/FREE-AI-PROVIDERS.md`** — better for deployed capstone without OpenAI billing.

---

The **floating AI button** (bottom-right) and admin/seller panels use OpenAI when configured. If OpenAI is off or out of credits, the app still answers using **live Supabase/marketplace data**.

Choose **Path A** (full OpenAI) or **Path B** (defense / no billing).

---

## Path A — OpenAI enabled (natural-language answers)

### Step 1 — OpenAI account and billing

1. Go to [platform.openai.com](https://platform.openai.com) and sign in (or create an account).
2. Open **Settings → Billing** (or [organization billing](https://platform.openai.com/settings/organization/billing)).
3. Add a **payment method** and **prepaid credits** (chat API will return **429** without credits).
4. Open **API keys** → **Create new secret key**.
5. Copy the key once (starts with `sk-proj-…` or `sk-…`). Do **not** paste it in chat, git, or screenshots.

### Step 2 — Local development (`.env.local`)

1. Open the project folder:  
   `C:\Users\kate angel\Downloads\Agriconnect Project`
2. Edit **`.env.local`** (create from **`.env.example`** if missing).
3. Add or update these lines **with no quotes** around the key:

```env
OPENAI_API_KEY=sk-proj-paste-your-key-here
OPENAI_MODEL=gpt-4o-mini
OPENAI_FORCE_DATABASE=0
```

4. Save the file.
5. Restart the dev server:
   - Stop `pnpm dev` (Ctrl+C).
   - Run `pnpm dev` again.

### Step 3 — Test from your computer

In PowerShell:

```powershell
cd "C:\Users\kate angel\Downloads\Agriconnect Project"
node --env-file=.env.local scripts/test-openai.mjs
```

| Result | Meaning |
|--------|---------|
| `[OK] OpenAI connected.` | Ready — go to Step 4 |
| `[FAIL] 429 … no credits` | Add billing credits (Step 1), then rerun |
| `[FAIL] … API key` | Fix `OPENAI_API_KEY` in `.env.local` |

Optional full check:

```powershell
node --env-file=.env.local scripts/verify-setup.mjs
```

### Step 4 — Test inside the app (local)

1. Open http://localhost:3000
2. Sign in as admin: **`admin@agriconnect.ph`** / **`password1`**
3. Go to **Admin → Platform settings**
4. Scroll to **OpenAI assistant** → click **Test OpenAI connection**
5. You should see a green success message.
6. Open the **floating AI icon** (bottom-right) and ask:  
   `Compare tomato prices across sellers`

Repeat as **buyer**, **seller**, or **delivery** demo accounts to see role-specific prompts.

### Step 5 — Published site (Figma Make / defense URL)

1. In **Figma Make**, open your AgriConnect file.
2. Open **Environment variables** (same area where Supabase keys live).
3. Add the **same three variables** as Step 2:
   - `OPENAI_API_KEY`
   - `OPENAI_MODEL` = `gpt-4o-mini`
   - `OPENAI_FORCE_DATABASE` = `0`
4. Ensure Supabase vars are already set (`NEXT_PUBLIC_SUPABASE_URL`, anon key, service role).
5. Click **Publish** (or redeploy) so the server loads the new env.
6. On the **live URL**, sign in as admin → **Platform settings** → **Test OpenAI connection** again.

---

## Path B — No OpenAI billing (capstone / defense)

Use this if you **cannot** add OpenAI credits. The assistant still works using **database mode**.

### Step 1 — Environment

**Local `.env.local`:**

```env
OPENAI_FORCE_DATABASE=1
SUPABASE_PHONE_AUTH_ENABLED=0
```

You may **omit** `OPENAI_API_KEY` or leave it empty.

**Published (Figma Make env vars):** same two lines, then **Publish**.

### Step 2 — Verify

```powershell
node --env-file=.env.local scripts/test-openai.mjs
```

Expected: `[OK] Database-only mode (OPENAI_FORCE_DATABASE=1)`

### Step 3 — Demo script (what to tell panelists)

> “AI is integrated with OpenAI API support, but our deployed demo uses **AgriConnect live data** for reliability and zero API cost. Answers come from real listings, orders, and applications.”

Use the floating assistant and admin **AI eligibility assist** — they work without OpenAI.

Details: **`docs/DEFENSE-DEPLOY.md`**

---

## Environment variables reference

| Variable | Required | Example | Notes |
|----------|----------|---------|--------|
| `OPENAI_API_KEY` | Path A only | `sk-proj-…` | Server-only; never in client code |
| `OPENAI_MODEL` | Optional | `gpt-4o-mini` | Default if omitted |
| `OPENAI_FORCE_DATABASE` | Recommended | `0` or `1` | `1` = never call OpenAI |

Never commit `.env.local`. Never use `NEXT_PUBLIC_` for the OpenAI key.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| **429 / no credits** | Add credits in OpenAI billing, or set `OPENAI_FORCE_DATABASE=1` |
| **Assistant shows raw JSON error** | Restart dev server; update app (fallback should show data answers) |
| **Test OK locally, fails on published URL** | Copy env vars to Figma Make → **Publish** again |
| **Admin test says “Force database Yes”** | Set `OPENAI_FORCE_DATABASE=0` and republish |
| **Key in quotes fails** | Use `OPENAI_API_KEY=sk-...` with **no** `"` quotes |

---

## What OpenAI powers (when enabled)

| Who | Example question |
|-----|------------------|
| Buyer / guest | Compare prices across sellers |
| Seller | Compare my prices with other farms |
| Courier | Which jobs are closest? (share location in chat) |
| Admin | Which applications are missing information? |

All answers are grounded in AgriConnect data; OpenAI only formats and explains.

---

## Quick checklist

- [ ] Billing/credits on OpenAI (Path A) **or** `OPENAI_FORCE_DATABASE=1` (Path B)
- [ ] `.env.local` updated, dev server restarted
- [ ] `scripts/test-openai.mjs` passes
- [ ] Admin → Platform settings → connection test OK
- [ ] Published env vars set + **Publish** (for defense URL)
- [ ] Floating assistant tested on live site
