'use client'

import { useState } from 'react'

export function AdminAiAssist({ kind, recordId, label }) {
  const [answer, setAnswer] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function requestSuggestion() {
    setPending(true)
    setAnswer('')
    setError('')
    try {
      const response = await fetch('/api/ai/admin-assistance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, recordId }),
      })
      const payload = await response.json()
      if (!response.ok) {
        setError(payload.error || 'AI assistance is unavailable.')
        return
      }
      setAnswer(payload.answer)
      if (payload.notice) setError(payload.notice)
    } catch {
      setError('Could not reach AI assistance.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="mt-3 border-l-2 border-brand-100 pl-3">
      <button
        type="button"
        onClick={requestSuggestion}
        disabled={pending}
        className="text-sm font-semibold text-brand-700 disabled:opacity-60"
      >
        {pending ? 'Preparing suggestion…' : label}
      </button>
      <p className="mt-1 text-xs text-brand-muted">
        Recommendations only. Review the evidence and decide manually; no record is changed.
      </p>
      {answer ? (
        <p className="mt-2 whitespace-pre-wrap rounded-lg bg-[#f7fbf4] p-3 text-sm leading-6 text-brand-900">
          {answer}
        </p>
      ) : null}
      {error ? (
        <p role="status" className="mt-2 text-xs text-amber-800">
          {error}
        </p>
      ) : null}
    </div>
  )
}
