'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatTimeAgo } from '@/lib/dashboard-format'

export function NotificationsPanel({ open, onClose }) {
  const router = useRouter()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/notifications', { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not load notifications.')
      setItems(data.notifications ?? [])
    } catch (err) {
      setError(err.message || 'Could not load notifications.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    load()
  }, [open, load])

  useEffect(() => {
    if (!open) return
    const onKey = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  async function markRead(id) {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setItems((prev) => prev.map((note) => (note.id === id ? { ...note, read: true } : note)))
    router.refresh()
  }

  async function markAllRead() {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    })
    setItems((prev) => prev.map((note) => ({ ...note, read: true })))
    router.refresh()
  }

  if (!open) return null

  const unread = items.filter((note) => !note.read).length

  return (
    <div className="fixed inset-0 z-[100]" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="notifications-panel-title"
        className="absolute right-4 top-[4.25rem] w-[min(100vw-2rem,22rem)] overflow-hidden rounded-2xl border border-[#173c2c]/10 bg-white shadow-xl sm:right-6"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-[#173c2c]/8 px-4 py-3">
          <h2 id="notifications-panel-title" className="text-sm font-bold text-[#142016]">
            Notifications
          </h2>
          {unread > 0 ? (
            <button type="button" onClick={markAllRead} className="text-xs font-bold text-[#4b9f30]">
              Mark all read
            </button>
          ) : null}
        </header>
        <div className="max-h-[min(24rem,70vh)] overflow-y-auto">
          {loading ? (
            <p className="px-4 py-6 text-sm text-[#647066]">Loading…</p>
          ) : error ? (
            <p className="m-3 rounded-xl bg-[#fff1ed] px-3 py-2 text-sm text-[#963b2d]">{error}</p>
          ) : items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-[#647066]">No notifications yet.</p>
          ) : (
            <ul>
              {items.slice(0, 12).map((note) => (
                <li key={note.id} className="border-b border-[#173c2c]/6 last:border-0">
                  <a
                    href={note.href || '/notifications'}
                    className={`block px-4 py-3 hover:bg-[#f7faf6] ${note.read ? 'opacity-75' : 'bg-[#f4faf0]/60'}`}
                    onClick={() => {
                      if (!note.read) markRead(note.id)
                      onClose()
                    }}
                  >
                    <p className="text-sm font-semibold text-[#142016]">{note.title}</p>
                    {note.body ? <p className="mt-0.5 text-xs leading-5 text-[#647066]">{note.body}</p> : null}
                    <p className="mt-1 text-[11px] text-[#647066]">{formatTimeAgo(note.createdAt)}</p>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
        <footer className="border-t border-[#173c2c]/8 px-4 py-2.5 text-center">
          <a href="/notifications" onClick={onClose} className="text-xs font-bold text-[#4b9f30]">
            View all notifications
          </a>
        </footer>
      </div>
    </div>
  )
}
