'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'

export function Modal({ title, subtitle, closeHref, children, size = 'lg' }) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    const onKey = (event) => {
      if (event.key === 'Escape') router.replace(closeHref, { scroll: false })
    }
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [closeHref, mounted, router])

  const width = size === 'xl' ? 'max-w-4xl' : 'max-w-2xl'

  if (!mounted) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[1400] flex items-end justify-center bg-[#142016]/40 p-0 sm:items-center sm:p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) router.replace(closeHref, { scroll: false })
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-modal-title"
        className={`flex max-h-[calc(100dvh-env(safe-area-inset-top)-0.5rem)] w-full ${width} flex-col overflow-hidden rounded-t-2xl border border-[#d5e4d4] bg-white pb-[env(safe-area-inset-bottom)] shadow-xl sm:max-h-[92vh] sm:rounded-2xl sm:pb-0`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#d5e4d4] px-5 py-4">
          <div className="min-w-0">
            <h2 id="app-modal-title" className="truncate text-[17px] font-bold text-[#142016]">{title}</h2>
            {subtitle ? <p className="mt-0.5 text-[13px] leading-5 text-[#5c6f62]">{subtitle}</p> : null}
          </div>
          <Link
            href={closeHref}
            replace
            className="grid size-9 shrink-0 place-items-center rounded-lg text-xl leading-none text-[#5c6f62] hover:bg-[#e7f3e4]"
            aria-label="Close"
          >
            ×
          </Link>
        </div>
        <div className="overflow-y-auto px-5 py-5">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
