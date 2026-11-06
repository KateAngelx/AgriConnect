'use client'

import { useEffect, useState } from 'react'

export function MobileRouteLoader() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(true), 300)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <div
      className={`pointer-events-none fixed inset-x-0 top-0 z-[200] h-1 bg-[#d5e4d4] transition-opacity duration-100 ${visible ? 'opacity-100' : 'opacity-0'}`}
      role="status"
      aria-label="Loading page"
      aria-live="polite"
      aria-hidden={!visible}
    >
      <div className="h-full w-1/3 animate-pulse bg-[#2e7d32]" aria-hidden="true" />
      <span className="sr-only">Loading page</span>
    </div>
  )
}
