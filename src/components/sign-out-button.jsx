'use client'

import { useFormStatus } from 'react-dom'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

export function SignOutButton({ className = '' }) {
  const { pending } = useFormStatus()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const overlay = mounted && pending ? createPortal(
    <div
      className="fixed inset-0 z-[2147483647] grid min-h-[100dvh] place-items-center bg-[#f3f8ef]/95"
      role="status"
      aria-label="Signing out"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100dvh',
        minHeight: '100dvh',
        margin: 0,
        zIndex: 2147483647,
      }}
    >
      <div className="flex flex-col items-center gap-3">
        <div className="size-12 animate-spin rounded-full border-[4px] border-[#d5e4d4] border-t-[#2e7d32]" aria-hidden="true" />
        <span className="font-semibold text-[#142016]">Signing out...</span>
      </div>
    </div>,
    document.body,
  ) : null

  return (
    <>
      <button
        type="submit"
        role="menuitem"
        disabled={pending}
        className={`${className} disabled:cursor-wait disabled:opacity-70`}
      >
        {pending ? 'Signing out...' : 'Sign out'}
      </button>
      {overlay}
    </>
  )
}
