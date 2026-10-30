'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

export function ConfirmDialog({ open, title = 'Confirm action', message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false, onConfirm, onCancel }) {
  const cancelRef = useRef(null)

  useEffect(() => {
    if (open) cancelRef.current?.focus()
  }, [open])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-[#142016]/45 p-4 backdrop-blur-[2px]" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onCancel?.()}>
      <div role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title" className="w-full max-w-sm rounded-2xl border border-[#173c2c]/10 bg-white p-5 shadow-2xl sm:p-6">
        <div className="grid size-11 place-items-center rounded-full bg-[#eef8e8] text-xl" aria-hidden="true">?</div>
        <h2 id="confirm-dialog-title" className="mt-4 text-lg font-bold text-[#142016]">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-[#65766d]">{message}</p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button ref={cancelRef} type="button" onClick={onCancel} className="rounded-full border border-[#173c2c]/15 px-4 py-2.5 text-sm font-bold text-[#455a64]">
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-full px-4 py-2.5 text-sm font-bold text-white ${danger ? 'bg-[#963b2d] hover:bg-[#792d22]' : 'bg-[#2e7d32] hover:bg-[#1b5e20]'}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export function RouteFeedbackToast() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const [feedback, setFeedback] = useState(null)

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
    <div role={success ? 'status' : 'alert'} className="fixed bottom-20 left-1/2 z-[110] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl border border-[#173c2c]/10 bg-white px-4 py-3 shadow-xl sm:bottom-6 sm:left-auto sm:right-6 sm:w-auto sm:max-w-sm sm:translate-x-0">
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
