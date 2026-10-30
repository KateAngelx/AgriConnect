'use client'

import { useRef, useState } from 'react'
import { ConfirmDialog } from './ui-feedback'

export function ConfirmButton({ message = 'Are you sure?', children, className = '', ...props }) {
  const [open, setOpen] = useState(false)
  const confirmed = useRef(false)
  const buttonRef = useRef(null)

  function handleClick(event) {
    if (confirmed.current) {
      confirmed.current = false
      return
    }
    event.preventDefault()
    setOpen(true)
  }

  function confirm() {
    confirmed.current = true
    setOpen(false)
    const button = buttonRef.current
    if (button?.form) button.form.requestSubmit(button)
  }

  return (
    <>
      <button ref={buttonRef} {...props} type={props.type || 'submit'} className={className} onClick={handleClick}>{children}</button>
      <ConfirmDialog open={open} message={message} confirmLabel="Yes, continue" onConfirm={confirm} onCancel={() => setOpen(false)} />
    </>
  )
}
