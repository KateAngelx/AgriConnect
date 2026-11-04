'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

export function ActionLoadingOverlay() {
  const pathname = usePathname()
  const [active, setActive] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    function handleSubmit() {
      setActive(true)
      window.clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(() => setActive(false), 30_000)
    }

    function handleLinkClick(event) {
      const target = event.target.closest('a[href]')
      if (!target || target.target === '_blank' || target.hasAttribute('download')) return

      const url = new URL(target.href, window.location.href)
      if (url.origin !== window.location.origin) return
      if (url.pathname === window.location.pathname && url.search === window.location.search) return

      setActive(true)
      window.clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(() => setActive(false), 30_000)
    }

    document.addEventListener('submit', handleSubmit, true)
    document.addEventListener('click', handleLinkClick, true)
    return () => {
      document.removeEventListener('submit', handleSubmit, true)
      document.removeEventListener('click', handleLinkClick, true)
      window.clearTimeout(timerRef.current)
    }
  }, [])

  useEffect(() => {
    setActive(false)
    window.clearTimeout(timerRef.current)
  }, [pathname])

  if (!active) return null

  return (
    <div
      className="fixed inset-0 z-[300] grid place-items-center bg-[#f3f8ef]/95"
      role="status"
      aria-label="Processing"
    >
      <div className="flex flex-col items-center gap-3">
        <div className="size-12 animate-spin rounded-full border-[4px] border-[#d5e4d4] border-t-[#2e7d32]" aria-hidden="true" />
        <span className="font-semibold text-[#142016]">Processing...</span>
      </div>
    </div>
  )
}
