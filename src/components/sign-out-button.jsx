'use client'

import { useFormStatus } from 'react-dom'

export function SignOutButton({ className = '' }) {
  const { pending } = useFormStatus()

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
      {pending ? (
        <div
          className="fixed inset-0 z-[300] grid place-items-center bg-[#f3f8ef]/95"
          role="status"
          aria-label="Signing out"
        >
          <div className="flex flex-col items-center gap-3">
            <div className="size-12 animate-spin rounded-full border-[4px] border-[#d5e4d4] border-t-[#2e7d32]" aria-hidden="true" />
            <span className="font-semibold text-[#142016]">Signing out...</span>
          </div>
        </div>
      ) : null}
    </>
  )
}
