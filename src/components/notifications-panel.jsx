'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { formatTimeAgo } from '@/lib/dashboard-format'

export function NotificationsPanel({ open, onClose, onUnreadChange }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [markingIds, setMarkingIds] = useState(() => new Set())
  const [markingAll, setMarkingAll] = useState(false)
  const operationBusy = useRef(false)
  const loadBusy = useRef(false)
  const loadedAt = useRef(0)

  const load = useCallback(async () => {
    if (loadBusy.current || Date.now() - loadedAt.current < 30_000) return
    loadBusy.current = true
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/notifications', {
        cache: 'no-store',
        credentials: 'same-origin',
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not load notifications.')
      setItems(data.notifications ?? [])
      const nextUnread = Number(
        data.unread ?? (data.notifications ?? []).filter((note) => !note.read).length,
      )
      onUnreadChange?.(nextUnread)
      loadedAt.current = Date.now()
    } catch (err) {
      setError(err.message || 'Could not load notifications.')
    } finally {
      loadBusy.current = false
      setLoading(false)
    }
  }, [onUnreadChange])

  useEffect(() => {
    if (open && Date.now() - loadedAt.current >= 30_000) load()
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
    const note = items.find((item) => item.id === id)
    if (!note || note.read || operationBusy.current) return
    operationBusy.current = true
    setMarkingIds((previous) => new Set(previous).add(id))
    setError('')
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        credentials: 'same-origin',
        keepalive: true,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not update notification.')
      setItems((prev) => prev.map((note) => (note.id === id ? { ...note, read: true } : note)))
      onUnreadChange?.(Math.max(0, unread - 1))
      loadedAt.current = Date.now()
    } catch (err) {
      setError(err.message || 'Could not update notification.')
    } finally {
      operationBusy.current = false
      setMarkingIds((previous) => {
        const next = new Set(previous)
        next.delete(id)
        return next
      })
    }
  }

  async function markAllRead() {
    if (operationBusy.current) return
    operationBusy.current = true
    setMarkingAll(true)
    setError('')
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not update notifications.')
      setItems((prev) => prev.map((note) => ({ ...note, read: true })))
      onUnreadChange?.(0)
      loadedAt.current = Date.now()
    } catch (err) {
      setError(err.message || 'Could not update notifications.')
    } finally {
      operationBusy.current = false
      setMarkingAll(false)
    }
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
            <button
              type="button"
              onClick={markAllRead}
              disabled={markingAll || markingIds.size > 0}
              className="text-xs font-bold text-[#4b9f30] disabled:cursor-wait disabled:opacity-60"
            >
              {markingAll ? 'Marking…' : 'Mark all read'}
            </button>
          ) : null}
        </header>
        <div className="max-h-[min(24rem,70vh)] overflow-y-auto">
          {error ? (
            <p
              role="alert"
              className="m-3 rounded-xl bg-[#fff1ed] px-3 py-2 text-sm text-[#963b2d]"
            >
              {error}
            </p>
          ) : null}
          {loading ? (
            <p className="px-4 py-6 text-sm text-[#647066]">Loading…</p>
          ) : items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-[#647066]">No notifications yet.</p>
          ) : (
            <ul>
              {items.slice(0, 12).map((note) => (
                <li key={note.id} className="border-b border-[#173c2c]/6 last:border-0">
                  <Link
                    href={note.href || '/notifications'}
                    className={`block px-4 py-3 hover:bg-[#f7faf6] ${note.read ? 'opacity-75' : 'bg-[#f4faf0]/60'}`}
                    onClick={() => {
                      markRead(note.id)
                      onClose()
                    }}
                  >
                    <p className="text-sm font-semibold text-[#142016]">{note.title}</p>
                    {note.body ? (
                      <p className="mt-0.5 text-xs leading-5 text-[#647066]">{note.body}</p>
                    ) : null}
                    <p className="mt-1 text-[11px] text-[#647066]">
                      {formatTimeAgo(note.createdAt)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <footer className="border-t border-[#173c2c]/8 px-4 py-2.5 text-center">
          <Link
            href="/notifications"
            onClick={onClose}
            className="text-xs font-bold text-[#4b9f30] hover:text-[#2e7d32]"
          >
            View all notifications
          </Link>
        </footer>
      </div>
    </div>
  )
}
