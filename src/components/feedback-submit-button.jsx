'use client'

import { useFormStatus } from 'react-dom'

export function FeedbackSubmitButton({ children = 'Submit feedback' }) {
  const { pending } = useFormStatus()

  return (
    <button type="submit" disabled={pending} className="btn btn-primary w-fit disabled:opacity-60">
      {pending ? 'Submitting…' : children}
    </button>
  )
}
