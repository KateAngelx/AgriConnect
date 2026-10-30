'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

const THREAD_STORAGE_KEY = 'agriconnect-ai-threads:v1'
const MAX_MESSAGES_PER_THREAD = 50

const QUICK = {
  buyer: [
    'Compare tomato prices across sellers',
    'What fresh greens can be delivered today?',
    'Cheapest rice listing on AgriConnect',
  ],
  seller: [
    'Compare my prices with other sellers',
    'Which products should I discount?',
    'What is low on stock?',
  ],
  delivery: [
    'Which open jobs are closest to me?',
    'Prioritize my route and estimate arrival times',
    'What should I pick up first?',
  ],
  admin: [
    'Summarize pending applications',
    'Which applicants are missing information?',
    'Who looks eligible for delivery partner role?',
  ],
}

const MODE_META = {
  buyer: {
    title: 'Shopper assistant',
    subtitle: 'Prices, delivery, and marketplace listings',
    empty:
      'Ask about product prices, stock, and delivery. I use live AgriConnect listings — not generic web search.',
  },
  seller: {
    title: 'Seller assistant',
    subtitle: 'Your inventory and pricing vs the market',
    empty: 'Ask how your prices compare, what to restock, or what to discount. Answers use your seller data.',
  },
  delivery: {
    title: 'Courier assistant',
    subtitle: 'Routes, jobs, and arrival estimates',
    empty: 'Ask which jobs to take first and estimated arrival times. Share location for nearby open jobs.',
  },
  admin: {
    title: 'Admin assistant',
    subtitle: 'Applications and eligibility screening',
    empty: 'Ask about pending seller or delivery applications. I never approve or reject — only summarize facts.',
  },
}

function assistantTitle(mode) {
  return MODE_META[mode]?.title || MODE_META.buyer.title
}

function readStoredThreads() {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(THREAD_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeStoredThreads(threads) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(THREAD_STORAGE_KEY, JSON.stringify(threads))
  } catch {
    /* quota or private mode */
  }
}

function autoModeFromUser(user) {
  if (!user) return 'buyer'
  if (user.roles?.includes('admin')) return 'admin'
  if (user.roles?.includes('delivery') && user.status === 'approved') return 'delivery'
  if (user.roles?.includes('seller') && user.status === 'approved' && user.sellerId) return 'seller'
  return 'buyer'
}

function modesForUser(user) {
  const modes = new Set(['buyer'])
  if (!user) return ['buyer']
  if (user.roles?.includes('seller') && user.status === 'approved' && user.sellerId) modes.add('seller')
  if (user.roles?.includes('delivery') && user.status === 'approved') modes.add('delivery')
  if (user.roles?.includes('admin')) modes.add('admin')
  return ['buyer', 'seller', 'delivery', 'admin'].filter((m) => modes.has(m))
}

function modeLabel(mode) {
  if (mode === 'seller') return 'Sell'
  if (mode === 'delivery') return 'Deliver'
  if (mode === 'admin') return 'Admin'
  return 'Shop'
}

function threadKey(user, mode) {
  return `${user?.id ?? 'guest'}:${mode}`
}

function safeProviderNotice(notice) {
  const text = String(notice || '').trim()
  if (/api key is forbidden|api key|generativelanguage|googleapis/i.test(text)) {
    return 'The AI provider rejected access. AgriConnect answered using live marketplace data instead.'
  }
  return text
}

export function FloatingAiAssistant({ user }) {
  const [open, setOpen] = useState(false)
  const [question, setQuestion] = useState('')
  const [threads, setThreads] = useState({})
  const [threadsReady, setThreadsReady] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [courierLocation, setCourierLocation] = useState(null)
  const [locating, setLocating] = useState(false)
  const [modeOverride, setModeOverride] = useState(null)

  const autoMode = useMemo(() => autoModeFromUser(user), [user])
  const availableModes = useMemo(() => modesForUser(user), [user])
  const mode = modeOverride && availableModes.includes(modeOverride) ? modeOverride : autoMode
  const sessionKey = useMemo(() => threadKey(user, mode), [user, mode])
  const messages = threads[sessionKey] ?? []

  useEffect(() => {
    setThreads(readStoredThreads())
    setThreadsReady(true)
  }, [])

  useEffect(() => {
    setModeOverride(null)
    setQuestion('')
    setError('')
  }, [user?.id])

  const persistThread = useCallback((key, list) => {
    setThreads((prev) => {
      const next = { ...prev, [key]: list }
      if (list.length === 0) {
        delete next[key]
      }
      writeStoredThreads(next)
      return next
    })
  }, [])

  const clearChat = useCallback(() => {
    persistThread(sessionKey, [])
    setQuestion('')
    setError('')
  }, [persistThread, sessionKey])

  const prompts = QUICK[mode] || QUICK.buyer
  const meta = MODE_META[mode] || MODE_META.buyer

  const shareLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Location is not available in this browser.')
      return
    }
    setLocating(true)
    setError('')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCourierLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocating(false)
      },
      () => {
        setLocating(false)
        setError('Could not read your location. Allow location access or type your question anyway.')
      },
      { enableHighAccuracy: false, timeout: 12_000, maximumAge: 120_000 },
    )
  }, [])

  async function send(text) {
    const q = String(text ?? question).trim()
    if (q.length < 2 || pending) return
    setPending(true)
    setError('')
    const userMessage = { role: 'user', text: q }
    const withUser = [...messages, userMessage].slice(-MAX_MESSAGES_PER_THREAD)
    persistThread(sessionKey, withUser)
    setQuestion('')
    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          mode,
          courierLat: courierLocation?.lat,
          courierLng: courierLocation?.lng,
        }),
      })
      const payload = await response.json()
      if (payload.answer) {
        const providerNotice = safeProviderNotice(payload.notice)
        const answerText = providerNotice
          ? `${payload.answer}\n\n(${providerNotice})`
          : payload.answer
        const withAssistant = [...withUser, { role: 'assistant', text: answerText }].slice(-MAX_MESSAGES_PER_THREAD)
        persistThread(sessionKey, withAssistant)
        if (!payload.answer && payload.error) setError(String(payload.error))
      } else {
        setError(payload.error || payload.notice || 'Assistant unavailable.')
      }
    } catch {
      setError('Could not reach the assistant.')
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      {open ? (
        <div
          className="fixed inset-0 z-[90] bg-black/25 sm:bg-transparent"
          aria-hidden
          onClick={() => setOpen(false)}
        />
      ) : null}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col items-end gap-3">
        {open ? (
          <div
            className="flex w-[min(100vw-2rem,24rem)] flex-col overflow-hidden rounded-2xl border border-[#173c2c]/12 bg-white shadow-2xl sm:w-[26rem]"
            role="dialog"
            aria-label={assistantTitle(mode)}
          >
            <header className="flex items-start justify-between gap-3 border-b border-[#173c2c]/10 bg-[#f8f8f3] px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-wide text-[#4f8d3b]">AI · {modeLabel(mode)}</p>
                <h2 className="text-base font-bold text-[#142016]">{meta.title}</h2>
                <p className="mt-0.5 text-xs text-[#647066]">
                  {user ? `${user.name} · ${meta.subtitle}` : meta.subtitle}
                </p>
              </div>
              <div className="flex shrink-0 items-start gap-1">
                {messages.length > 0 ? (
                  <button
                    type="button"
                    onClick={clearChat}
                    className="rounded-full px-2 py-1 text-xs font-semibold text-[#647066] hover:bg-white"
                  >
                    Clear
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-full px-2 py-1 text-sm font-bold text-[#647066] hover:bg-white"
                  aria-label="Close assistant"
                >
                  ✕
                </button>
              </div>
            </header>
            {availableModes.length > 1 ? (
              <div className="flex flex-wrap gap-1.5 border-b border-[#173c2c]/8 bg-white px-3 py-2">
                {availableModes.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setModeOverride(m)
                      setError('')
                    }}
                    className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                      mode === m
                        ? 'bg-[#173c2c] text-white'
                        : 'border border-[#173c2c]/12 bg-[#f8f8f3] text-[#647066] hover:border-[#5dbb38]'
                    }`}
                  >
                    {modeLabel(m)}
                  </button>
                ))}
              </div>
            ) : null}
            <div className="max-h-[min(52vh,26rem)] space-y-3 overflow-y-auto px-4 py-3">
              {!threadsReady ? (
                <p className="text-sm text-[#647066]">Loading conversation…</p>
              ) : messages.length === 0 ? (
                <p className="text-sm text-[#647066]">{meta.empty}</p>
              ) : null}
              {messages.map((msg, index) => (
                <div
                  key={`${sessionKey}-${msg.role}-${index}`}
                  className={`rounded-2xl px-3 py-2 text-sm leading-6 whitespace-pre-wrap ${
                    msg.role === 'user' ? 'ml-8 bg-[#eef8e8] text-[#142016]' : 'mr-4 bg-[#f8f8f3] text-[#243126]'
                  }`}
                >
                  {msg.text}
                </div>
              ))}
            </div>
            {mode === 'delivery' ? (
              <div className="border-t border-[#173c2c]/8 px-4 py-2">
                <button
                  type="button"
                  onClick={shareLocation}
                  disabled={locating}
                  className="text-xs font-bold text-[#4b9f30] disabled:opacity-60"
                >
                  {locating
                    ? 'Getting location…'
                    : courierLocation
                      ? 'Location shared — tap to refresh'
                      : 'Use my location for nearby jobs'}
                </button>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2 border-t border-[#173c2c]/8 px-4 py-2">
              {prompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => send(prompt)}
                  disabled={pending}
                  className="rounded-full border border-[#173c2c]/12 bg-white px-3 py-1 text-xs font-semibold text-[#647066] hover:border-[#5dbb38]"
                >
                  {prompt.length > 42 ? `${prompt.slice(0, 40)}…` : prompt}
                </button>
              ))}
            </div>
            <form
              className="flex gap-2 border-t border-[#173c2c]/10 p-3"
              onSubmit={(event) => {
                event.preventDefault()
                send(question)
              }}
            >
              <input
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="Ask anything…"
                className="min-w-0 flex-1 rounded-xl border border-black/10 px-3 py-2 text-sm outline-none focus:border-[#5dbb38]"
              />
              <button
                type="submit"
                disabled={pending || question.trim().length < 2}
                className="shrink-0 rounded-xl bg-[#5dbb38] px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
              >
                {pending ? '…' : 'Send'}
              </button>
            </form>
            {error ? (
              <p role="alert" className="px-4 pb-3 text-xs text-[#963b2d]">
                {error}
              </p>
            ) : null}
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="grid size-14 place-items-center rounded-full bg-[#173c2c] text-white shadow-lg ring-4 ring-white transition hover:bg-[#1f4a35]"
          aria-label={open ? 'Close AI assistant' : 'Open AI assistant'}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M12 3c-4.4 0-8 2.7-8 6v5c0 1.1.9 2 2 2h1v3l3.5-2.5H18c3.3 0 6-2.7 6-6V9c0-3.3-3.6-6-8-6Z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <circle cx="9" cy="11" r="1.1" fill="currentColor" />
            <circle cx="12" cy="11" r="1.1" fill="currentColor" />
            <circle cx="15" cy="11" r="1.1" fill="currentColor" />
          </svg>
        </button>
      </div>
    </>
  )
}
