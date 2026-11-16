'use client'

import { useEffect, useRef } from 'react'
import { useFormStatus } from 'react-dom'

// A submit button that locks itself while its form's server action runs,
// so a double click cannot send the same action twice.
export function SubmitButton({ children, pendingLabel, disabled, className = '', ...props }) {
  const { pending } = useFormStatus()
  const buttonRef = useRef(null)
  const locked = useRef(false)
  const sawPending = useRef(false)

  // `disabled={pending}` only applies after React re-renders, so a very fast second
  // click can still submit. Block repeat submits synchronously as well. Listening to
  // `submit` (not `click`) means a form that fails validation never gets locked.
  useEffect(() => {
    const form = buttonRef.current?.form
    if (!form) return undefined
    const onSubmit = (event) => {
      if (locked.current) {
        event.preventDefault()
        event.stopPropagation()
        return
      }
      locked.current = true
      sawPending.current = false
      // Safety net in case the action never reports pending (for example a plain GET form).
      window.setTimeout(() => {
        if (!sawPending.current) locked.current = false
      }, 1500)
    }
    form.addEventListener('submit', onSubmit, true)
    return () => form.removeEventListener('submit', onSubmit, true)
  }, [])

  useEffect(() => {
    if (pending) {
      sawPending.current = true
    } else if (sawPending.current) {
      locked.current = false
      sawPending.current = false
    }
  }, [pending])

  return (
    <button
      ref={buttonRef}
      {...props}
      type="submit"
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      className={className}
    >
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  )
}
