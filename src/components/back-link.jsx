'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

// Goes back to the previous page inside AgriConnect. When the page was opened directly
// (a shared link, a new tab), there is nothing to go back to, so it opens `href` instead.
export function BackLink({ href, label = 'Back', className = '' }) {
  const router = useRouter()

  function onClick(event) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
    const cameFromHere = document.referrer && new URL(document.referrer).origin === window.location.origin
    if (cameFromHere && window.history.length > 1) {
      event.preventDefault()
      router.back()
    }
  }

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`inline-flex min-h-10 w-fit items-center gap-1.5 rounded-lg text-sm font-semibold text-brand-700 hover:text-brand-900 ${className}`}
    >
      <span aria-hidden="true">←</span>
      {label}
    </Link>
  )
}
