'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { DashboardIcon } from '@/components/dashboard-icons'
import { formatTimeAgo } from '@/lib/dashboard-format'

const previewCount = 4

function UpdateList({ notes }) {
  return (
    <ul className="space-y-4">
      {notes.map((note) => (
        <li key={note.id} className="flex gap-3">
          <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-[#f1f3f4] text-[#455a64]">
            <DashboardIcon name="bell" className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[#142016]">{note.title}</p>
            <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-[#65766d]">{note.body}</p>
            <p className="mt-1 text-[11px] text-[#8a958c]">{formatTimeAgo(note.createdAt)}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}

export function NotificationFeed({ notes = [], emptyMessage = 'No recent updates.' }) {
  const [open, setOpen] = useState(false)
  const preview = notes.slice(0, previewCount)
  const hasMore = notes.length > previewCount

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <section className="ui-card flex h-[33rem] flex-col overflow-hidden">
      <div className="shrink-0 border-b border-[#d5e4d4] px-4 py-3 sm:px-5">
        <h2 className="text-[17px] font-semibold text-[#142016]">Recent updates</h2>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
        {preview.length ? <UpdateList notes={preview} /> : <p className="text-sm text-[#65766d]">{emptyMessage}</p>}
        {hasMore ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mt-4 text-sm font-bold text-[#4f8d3b] hover:text-[#2e7d32]"
          >
            View more
          </button>
        ) : null}
      </div>
      {open && typeof document !== 'undefined' ? createPortal(
        <div
          className="fixed inset-0 z-[1400] flex items-end justify-center bg-[#142016]/40 p-0 sm:items-center sm:p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false)
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="recent-updates-title"
            className="flex max-h-[calc(100dvh-env(safe-area-inset-top)-0.5rem)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-[#d5e4d4] bg-white pb-[env(safe-area-inset-bottom)] shadow-xl sm:max-h-[92vh] sm:rounded-2xl sm:pb-0"
          >
            <div className="flex items-start justify-between gap-3 border-b border-[#d5e4d4] px-5 py-4">
              <div>
                <h2 id="recent-updates-title" className="text-[17px] font-bold text-[#142016]">Recent updates</h2>
                <p className="mt-0.5 text-[13px] leading-5 text-[#5c6f62]">{notes.length} updates</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid size-9 shrink-0 place-items-center rounded-lg text-xl leading-none text-[#5c6f62] hover:bg-[#e7f3e4]"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="overflow-y-auto px-5 py-5">
              <UpdateList notes={notes} />
            </div>
          </div>
        </div>,
        document.body,
      ) : null}
    </section>
  )
}
