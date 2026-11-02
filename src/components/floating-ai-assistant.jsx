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
      <div className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-[max(1.25rem,env(safe-area-inset-right))] z-[100] flex w-[min(26rem,calc(100vw-2.5rem))] flex-col items-end gap-3">
        {open ? (
          <div
            className="flex max-h-[min(34rem,calc(100dvh-7.5rem-env(safe-area-inset-top)-env(safe-area-inset-bottom)))] w-full min-h-0 flex-col overflow-hidden rounded-xl border border-[#d5e4d4] bg-white shadow-[0_12px_40px_rgb(20_32_22/0.16)]"
            role="dialog"
            aria-label={assistantTitle(mode)}
          >
            <header className="flex shrink-0 items-center gap-3 border-b border-[#d5e4d4] px-4 py-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-[#2e7d32] text-white">
                <svg viewBox="0 0 24 24" className="size-5 fill-none stroke-current stroke-2" aria-hidden="true">
                  <path d="M7 18 4 21V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H7Z" />
                </svg>
              </span>
              <div className="min-w-0 flex-1">
                <p className="page-eyebrow">{modeLabel(mode)}</p>
                <h2 className="truncate text-[15px] font-semibold text-[#142016]">{meta.title}</h2>
                <p className="truncate text-[13px] text-[#5c6f62]">
                  {user ? `${user.name} · ${meta.subtitle}` : meta.subtitle}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {messages.length > 0 ? (
                  <button
                    type="button"
                    onClick={clearChat}
                    className="rounded-lg px-2 py-1.5 text-[13px] font-semibold text-[#5c6f62] hover:bg-[#e8f5e3]"
                  >
                    Clear
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="grid size-9 place-items-center rounded-lg text-[#142016] hover:bg-[#e8f5e3]"
                  aria-label="Close assistant"
                >
                  <svg viewBox="0 0 24 24" className="size-4 fill-none stroke-current stroke-2" aria-hidden="true">
                    <path d="M6 6l12 12M18 6 6 18" />
                  </svg>
                </button>
              </div>
            </header>
            {availableModes.length > 1 ? (
              <div className="flex shrink-0 gap-1 border-b border-[#d5e4d4] px-3 py-2">
                {availableModes.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setModeOverride(m)
                      setError('')
                    }}
                    className={`rounded-lg px-3 py-1.5 text-[13px] font-medium ${
                      mode === m ? 'bg-[#e3f3d8] text-[#1b5e20]' : 'text-[#142016] hover:bg-[#e3f3d8]'
                    }`}
                  >
                    {modeLabel(m)}
                  </button>
                ))}
              </div>
            ) : null}
            <div className="min-h-28 flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {!threadsReady ? (
                <p className="text-sm leading-6 text-[#5c6f62]">Loading conversation…</p>
              ) : messages.length === 0 ? (
                <p className="text-sm leading-6 text-[#5c6f62]">{meta.empty}</p>
              ) : null}
              {messages.map((msg, index) => (
                <div
                  key={`${sessionKey}-${msg.role}-${index}`}
                  className={`whitespace-pre-wrap rounded-xl px-3 py-2 text-sm leading-6 ${
                    msg.role === 'user'
                      ? 'ml-8 bg-[#e8f5e3] text-[#142016]'
                      : 'mr-6 border border-[#d5e4d4] bg-[#f3f8ef] text-[#142016]'
                  }`}
                >
                  {msg.text}
                </div>
              ))}
            </div>
            {mode === 'delivery' ? (
              <div className="shrink-0 border-t border-[#d5e4d4] px-4 py-2">
                <button
                  type="button"
                  onClick={shareLocation}
                  disabled={locating}
                  className="text-[13px] font-semibold text-[#2e7d32] disabled:opacity-60"
                >
                  {locating
                    ? 'Getting location…'
                    : courierLocation
                      ? 'Location shared — tap to refresh'
                      : 'Use my location for nearby jobs'}
                </button>
              </div>
            ) : null}
            <div className="flex shrink-0 gap-2 overflow-x-auto border-t border-[#d5e4d4] px-4 py-3">
              {prompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => send(prompt)}
                  disabled={pending}
                  className="shrink-0 rounded-full border border-[#d5e4d4] bg-white px-3 py-1.5 text-[13px] font-medium text-[#142016] hover:bg-[#e8f5e3] disabled:opacity-60"
                >
                  {prompt.length > 42 ? `${prompt.slice(0, 40)}…` : prompt}
                </button>
              ))}
            </div>
            <form
              className="flex shrink-0 items-center gap-2 border-t border-[#d5e4d4] p-3"
              onSubmit={(event) => {
                event.preventDefault()
                send(question)
              }}
            >
              <label htmlFor="floating-ai-question" className="sr-only">
                Ask the assistant
              </label>
              <input
                id="floating-ai-question"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="Ask anything…"
                className="ui-field min-w-0 flex-1"
              />
              <button type="submit" disabled={pending || question.trim().length < 2} className="btn btn-primary shrink-0">
                {pending ? '…' : 'Send'}
              </button>
            </form>
            {error ? (
              <p role="alert" className="shrink-0 px-4 pb-3 text-[13px] leading-5 text-[#963b2d]">
                {error}
              </p>
            ) : null}
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="grid size-14 shrink-0 place-items-center rounded-full bg-[#2e7d32] text-white shadow-lg hover:bg-[#1b5e20]"
          aria-label={open ? 'Close AI assistant' : 'Open AI assistant'}
        >
          {open ? (
            <svg viewBox="0 0 24 24" className="size-6 fill-none stroke-current stroke-2" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="size-6 fill-none stroke-current stroke-2" aria-hidden="true">
              <path d="M7 18 4 21V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H7Z" />
            </svg>
          )}
        </button>
      </div>
    </>
  )
}
