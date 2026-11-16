'use client'

import { useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { ConfirmDialog } from './ui-feedback'

export function ConfirmButton({
  message = 'Are you sure?',
  confirmLabel = 'Yes, continue',
  danger = false,
  children,
  className = '',
  disabled,
  ...props
}) {
  const [open, setOpen] = useState(false)
  const { pending } = useFormStatus()
  const buttonRef = useRef(null)

  function handleClick(event) {
    // requestSubmit() below does not dispatch a click, so every real click asks first.
    event.preventDefault()
    if (pending) return
    setOpen(true)
  }

  function confirm() {
    setOpen(false)
    const button = buttonRef.current
    if (button?.form) button.form.requestSubmit(button)
  }

  return (
    <>
      <button
        ref={buttonRef}
        {...props}
        type={props.type || 'submit'}
        disabled={disabled || pending}
        aria-busy={pending || undefined}
        className={className}
        onClick={handleClick}
      >
        {pending ? 'Processing…' : children}
      </button>
      <ConfirmDialog
        open={open}
        message={message}
        confirmLabel={confirmLabel}
        danger={danger}
        onConfirm={confirm}
        onCancel={() => setOpen(false)}
      />
    </>
  )
}
