'use client'

import { useState } from 'react'

export function AiAssistantPanel({
  endpoint,
  title,
  description,
  placeholder,
  requestBody = {},
  eyebrow = 'AI assistant',
}) {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function ask(event) {
    event.preventDefault()
    setPending(true)
    setError('')
    setAnswer('')
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, ...requestBody }),
      })
      const payload = await response.json()
      if (payload.answer) {
        setAnswer(
          payload.notice ? `${payload.answer}\n\n(${payload.notice})` : payload.answer,
        )
        return
      }
      if (!response.ok) {
        setError(payload.error || payload.notice || 'Assistant unavailable.')
        return
      }
    } catch {
      setError('Could not reach the assistant. Check your connection and try again.')
    } finally {
      setPending(false)
    }
  }

  return (
    <section className="rounded-2xl border border-[#173c2c]/10 bg-white p-5 shadow-sm sm:p-6">
      <p className="page-eyebrow text-[#4f8d3b]">{eyebrow}</p>
      <h2 className="page-section-title mt-1 text-lg">{title}</h2>
      {description ? <p className="mt-2 text-sm text-[#647066]">{description}</p> : null}
      <form onSubmit={ask} className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder={placeholder}
          className="flex-1 rounded-2xl border border-black/10 bg-[#fafbfa] px-4 py-3 text-sm outline-none focus:border-[#5dbb38]"
        />
        <button
          type="submit"
          disabled={pending || question.trim().length < 3}
          className="rounded-full bg-[#5dbb38] px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
        >
          {pending ? 'Thinking…' : 'Ask'}
        </button>
      </form>
      {error ? (
        <p role="alert" className="mt-4 rounded-xl bg-[#fff8ed] px-4 py-3 text-sm text-[#7a4b12]">
          {error}
        </p>
      ) : null}
      {answer ? (
        <div className="mt-4 rounded-2xl bg-[#f8f8f3] p-4 text-sm leading-7 text-[#243126] whitespace-pre-wrap">
          {answer}
        </div>
      ) : null}
    </section>
  )
}
