'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

export function ConfirmDialog({ open, title = 'Confirm action', message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false, onConfirm, onCancel }) {
  const cancelRef = useRef(null)
  const onCancelRef = useRef(onCancel)
  onCancelRef.current = onCancel

  useEffect(() => {
    if (!open) return
    cancelRef.current?.focus()
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event) => {
      if (event.key === 'Escape') onCancelRef.current?.()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!open || typeof document === 'undefined') return null
  return createPortal(
    <div className="fixed inset-0 z-[1400] grid place-items-center bg-black/40 p-4" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onCancel?.()}>
      <div role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title" className="max-h-[min(32rem,calc(100dvh-2rem))] w-full max-w-sm overflow-y-auto rounded-xl border border-[#e5e5ea] bg-white p-5 shadow-xl sm:p-6">
        <div className={`grid size-11 place-items-center rounded-full text-xl ${danger ? 'bg-[#fff1ed] text-[#963b2d]' : 'bg-[#eef8e8] text-[#2e7d32]'}`} aria-hidden="true">{danger ? '!' : '?'}</div>
        <h2 id="confirm-dialog-title" className="mt-4 text-lg font-bold text-[#142016]">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-[#65766d]">{message}</p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button ref={cancelRef} type="button" onClick={onCancel} className="btn btn-secondary">
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={danger ? 'btn btn-danger' : 'btn btn-primary'}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export function RouteFeedbackToast() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const [feedback, setFeedback] = useState(null)

  useEffect(() => {
    let timeout
    const showFeedback = (event) => {
      if (!event.detail?.text) return
      setFeedback({ tone: event.detail.tone || 'success', text: event.detail.text })
      window.clearTimeout(timeout)
      timeout = window.setTimeout(() => setFeedback(null), 4500)
    }
    window.addEventListener('agriconnect:feedback', showFeedback)
    return () => {
      window.clearTimeout(timeout)
      window.removeEventListener('agriconnect:feedback', showFeedback)
    }
  }, [])

  useEffect(() => {
    const success = searchParams.get('success')
    const error = searchParams.get('error')
    if (!success && !error) {
      setFeedback(null)
      return
    }
    const technicalError = /(api key is forbidden|api[_ -]?key|generativelanguage|googleapis)/i.test(error || '')
    setFeedback({
      tone: error ? 'error' : 'success',
      text: technicalError ? 'A connected service rejected access. Please check its API permissions or try again.' : (error || success),
    })
    const timeout = window.setTimeout(() => setFeedback(null), 4500)
    const params = new URLSearchParams(searchParams.toString())
    params.delete('success')
    params.delete('error')
    const query = params.toString()
    router.replace(`${pathname}${query ? `?${query}` : ''}`, { scroll: false })
    return () => window.clearTimeout(timeout)
  }, [searchParams, pathname, router])

  if (!feedback) return null
  const success = feedback.tone === 'success'
  return (
    <div role={success ? 'status' : 'alert'} className="fixed left-1/2 top-[calc(env(safe-area-inset-top)+0.75rem)] z-[1200] w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 rounded-2xl border border-[#173c2c]/10 bg-white px-4 py-3 shadow-xl sm:left-auto sm:right-6 sm:w-auto sm:max-w-sm sm:translate-x-0">
      <div className="flex items-start gap-3">
        <span className={`grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold ${success ? 'bg-[#e8f5e3] text-[#2e7d32]' : 'bg-[#fff1ed] text-[#963b2d]'}`}>
          {success ? '✓' : '!'}
        </span>
        <p className="pt-1 text-sm font-semibold leading-5 text-[#142016]">{feedback.text}</p>
        <button type="button" onClick={() => setFeedback(null)} aria-label="Dismiss notification" className="ml-auto grid size-7 shrink-0 place-items-center rounded-full text-lg text-[#65766d] hover:bg-[#f4f6f8]">×</button>
      </div>
    </div>
  )
}
