'use client'

import { useCallback, useEffect, useState } from 'react'

const SETUP_SNIPPETS = {
  gemini: `# Google AI Studio (Gemini)
AI_PROVIDER=gemini
GEMINI_API_KEY=AIza...
AI_MODEL=gemini-3.5-flash-lite
OPENAI_FORCE_DATABASE=0`,
  groq: `# Groq (free tier)
AI_PROVIDER=groq
GROQ_API_KEY=gsk_...
AI_MODEL=llama-3.1-8b-instant
OPENAI_FORCE_DATABASE=0`,
  database: `# No LLM — live data only (capstone)
OPENAI_FORCE_DATABASE=1`,
}

export function AiIntegrationPanel() {
  const [setup, setSetup] = useState(null)
  const [test, setTest] = useState(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [snippet, setSnippet] = useState('gemini')

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/ai/status')
      const payload = await response.json()
      if (!response.ok) {
        setError(payload.error || 'Could not load AI status.')
        return
      }
      setSetup(payload)
      if (payload.provider === 'groq') setSnippet('groq')
      else if (payload.provider === 'gemini') setSnippet('gemini')
      else if (payload.mode === 'database') setSnippet('database')
      setError('')
    } catch {
      setError('Could not load AI status.')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function runTest() {
    setPending(true)
    setTest(null)
    setError('')
    try {
      const response = await fetch('/api/ai/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: true }),
      })
      const payload = await response.json()
      setSetup(payload)
      setTest(payload.test || null)
      if (!response.ok && !payload.test?.ok) setError(payload.error || 'Test failed.')
    } catch {
      setError('Connection test failed.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="space-y-4 text-sm text-[#647066]">
      <p className="leading-6">
        <strong className="text-[#142016]">Google AI Studio (Gemini)</strong>, Groq, OpenRouter, or OpenAI can
        power the floating assistant. Answers are always grounded in live AgriConnect data. Setup guide:{' '}
        <code className="text-[#142016]">docs/GEMINI-AI-STUDIO-SETUP.md</code>
      </p>
      <dl className="grid gap-2 rounded-xl bg-[#f8f8f3] p-4">
        <div className="flex justify-between gap-4">
          <dt className="font-semibold text-[#142016]">Provider</dt>
          <dd>{setup?.provider || '—'}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="font-semibold text-[#142016]">Mode</dt>
          <dd>{setup?.mode === 'database' ? 'Database only' : `${setup?.mode} + database`}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="font-semibold text-[#142016]">API key</dt>
          <dd>{setup?.hasKey ? 'Configured (hidden)' : 'Not set'}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="font-semibold text-[#142016]">Model</dt>
          <dd>{setup?.model || '—'}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="font-semibold text-[#142016]">Force database</dt>
          <dd>{setup?.forceDatabase ? 'Yes (LLM skipped)' : 'No'}</dd>
        </div>
      </dl>
      <div className="rounded-xl border border-[#173c2c]/10 bg-white p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-[#4f8d3b]">Environment template</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {(['gemini', 'groq', 'database']).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setSnippet(key)}
              className={`rounded-full px-3 py-1 text-xs font-bold ${snippet === key ? 'bg-[#173c2c] text-white' : 'border border-[#173c2c]/15 bg-[#fafbfa]'}`}
            >
              {key === 'gemini' ? 'Google Gemini' : key === 'groq' ? 'Groq' : 'Data only'}
            </button>
          ))}
        </div>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-[#142016] p-3 text-xs text-[#e8f5e3]">
          {SETUP_SNIPPETS[snippet]}
        </pre>
        <p className="mt-2 text-xs leading-5">
          Local: <code className="text-[#142016]">.env.local</code> · Published: Figma Make environment variables →
          Publish again.
        </p>
      </div>
      <button
        type="button"
        onClick={runTest}
        disabled={pending}
        className="rounded-full bg-[#173c2c] px-5 py-2.5 text-xs font-bold text-white disabled:opacity-60"
      >
        {pending ? 'Testing…' : 'Test AI connection'}
      </button>
      {test ? (
        <p
          className={`rounded-xl px-4 py-3 text-sm ${test.ok ? 'bg-[#eef8e8] text-[#2d6b1f]' : 'bg-[#fff8ed] text-[#7a4b12]'}`}
        >
          {test.message}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="rounded-xl bg-[#fff1ed] px-4 py-3 text-sm text-[#963b2d]">
          {error}
        </p>
      ) : null}
    </div>
  )
}
