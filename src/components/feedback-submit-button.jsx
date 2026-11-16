'use client'

import { SubmitButton } from '@/components/submit-button'

export function FeedbackSubmitButton({ children = 'Submit feedback', className = '' }) {
  return (
    <SubmitButton
      pendingLabel="Submitting…"
      className={`btn btn-primary w-fit disabled:opacity-60 ${className}`}
    >
      {children}
    </SubmitButton>
  )
}
