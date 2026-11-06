'use client'

import { useFormStatus } from 'react-dom'

export function FeedbackSubmitButton({ children = 'Submit feedback', className = '' }) {
  const { pending } = useFormStatus()

  return (
    <button type="submit" disabled={pending} className={`btn btn-primary w-fit disabled:opacity-60 ${className}`}>
      {pending ? 'Submitting…' : children}
    </button>
  )
}
