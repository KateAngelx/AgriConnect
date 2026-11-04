'use client'

import { useId, useState } from 'react'
import { AiMessage } from '@/components/ai-message'

export function AiAssistantPanel({
  endpoint,
  title,
  description,
  placeholder,
  requestBody = {},
  eyebrow = 'AI assistant',
  framed = false,
}) {
  const inputId = useId()
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
    <section className={framed ? 'ui-card flex h-[33rem] flex-col overflow-hidden' : 'ui-card p-5'}>
      <div className={framed ? 'min-h-0 flex-1 overflow-y-auto p-4 sm:p-5' : undefined}>
      <p className="page-eyebrow">{eyebrow}</p>
      <h2 className="mt-2 text-lg font-semibold text-[#142016]">{title}</h2>
      {description ? <p className="mt-2 text-sm leading-6 text-[#5c6f62]">{description}</p> : null}
      <form onSubmit={ask} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-stretch">
        <label htmlFor={inputId} className="sr-only">
          Question
        </label>
        <input
          id={inputId}
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder={placeholder}
          className="ui-field min-w-0 flex-1"
        />
        <button type="submit" disabled={pending || question.trim().length < 3} className="btn btn-primary w-full sm:w-auto">
          {pending ? 'Thinking…' : 'Ask'}
        </button>
      </form>
      {error ? (
        <p role="alert" className="mt-4 rounded-[10px] bg-[#fff8ed] px-4 py-3 text-sm leading-6 text-[#7a4b12]">
          {error}
        </p>
      ) : null}
      {answer ? (
        <div className="mt-4 rounded-[10px] bg-[#f3f8ef] px-4 py-3 text-sm leading-6 text-[#142016]">
          <AiMessage text={answer} />
        </div>
      ) : null}
      </div>
    </section>
  )
}
