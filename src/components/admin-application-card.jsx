'use client'

import { useRef, useState } from 'react'
import { StatusBadge } from '@/components/dashboard-ui'

export function AdminApplicationCard({ entry, reviewAction }) {
  const decisionRef = useRef(null)
  const [aiHint, setAiHint] = useState('')
  const [aiError, setAiError] = useState('')
  const [aiPending, setAiPending] = useState(false)

  async function requestAiHint() {
    setAiPending(true)
    setAiError('')
    setAiHint('')
    try {
      const response = await fetch('/api/ai/application-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId: entry.id }),
      })
      const payload = await response.json()
      if (!response.ok) {
        setAiError(payload.error || 'Assistant unavailable.')
        return
      }
      setAiHint(payload.answer)
    } catch {
      setAiError('Could not reach the assistant.')
    } finally {
      setAiPending(false)
    }
  }

  function confirmSubmit(event, decision) {
    decisionRef.current.value = decision
    if (decision === 'approved' || decision === 'rejected') {
      const verb = decision === 'approved' ? 'approve' : 'reject'
      if (!window.confirm(`Confirm that you want to ${verb} this application?`)) {
        event.preventDefault()
      }
    }
  }

  return (
    <li className="rounded-xl border border-[#173c2c]/10 bg-[#fafbfa] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-base font-bold text-[#142016]">{entry.user?.name || 'Applicant'}</p>
          <p className="text-sm text-[#65766d]">
            {entry.user?.email} · {entry.applicationType} application
          </p>
        </div>
        <StatusBadge status={entry.status} />
      </div>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        {Object.entries(entry.payload || {}).map(([key, value]) => (
          <div key={key}>
            <dt className="font-semibold capitalize text-[#142016]">{key.replaceAll(/([A-Z])/g, ' $1')}</dt>
            <dd className="text-[#65766d]">{String(value)}</dd>
          </div>
        ))}
      </dl>
      {entry.adminNote ? (
        <p className="mt-3 rounded-lg bg-white px-3 py-2 text-sm text-[#647066]">Note: {entry.adminNote}</p>
      ) : null}
      <div className="mt-3">
        <button
          type="button"
          onClick={requestAiHint}
          disabled={aiPending}
          className="text-xs font-bold text-[#4b9f30] disabled:opacity-60"
        >
          {aiPending ? 'Analyzing…' : 'AI eligibility assist'}
        </button>
        <p className="mt-1 text-xs text-[#65766d]">Suggestions only — you must approve or reject manually.</p>
        {aiError ? <p className="mt-2 text-xs text-[#963b2d]">{aiError}</p> : null}
        {aiHint ? (
          <p className="mt-2 whitespace-pre-wrap rounded-lg bg-white px-3 py-2 text-sm text-[#647066]">{aiHint}</p>
        ) : null}
      </div>
      {['pending', 'under-review', 'needs-info'].includes(entry.status) ? (
        <form action={reviewAction} className="mt-4 space-y-3">
          <input type="hidden" name="applicationId" value={entry.id} />
          <input type="hidden" name="decision" ref={decisionRef} defaultValue="" />
          {entry.status === 'needs-info' ? (
            <p className="rounded-lg bg-white px-3 py-2 text-sm text-[#647066]">
              Waiting for the applicant to resubmit. You can mark under review again, but approve and
              reject unlock after they send an updated application.
            </p>
          ) : null}
          <textarea
            name="adminNote"
            rows={2}
            placeholder="Note to the applicant (required when requesting additional information)"
            className="w-full rounded-xl border border-[#173c2c]/12 px-3 py-2 text-sm"
          />
          <div className="flex flex-wrap gap-2">
            <ReviewButton label="Under review" onClick={(event) => confirmSubmit(event, 'under-review')} />
            {entry.status !== 'needs-info' ? (
              <ReviewButton label="Request info" onClick={(event) => confirmSubmit(event, 'needs-info')} />
            ) : null}
            {entry.status !== 'needs-info' ? (
              <>
                <ReviewButton label="Approve" primary onClick={(event) => confirmSubmit(event, 'approved')} />
                <ReviewButton label="Reject" danger onClick={(event) => confirmSubmit(event, 'rejected')} />
              </>
            ) : null}
          </div>
        </form>
      ) : null}
    </li>
  )
}

function ReviewButton({ label, primary, danger, onClick }) {
  return (
    <button
      type="submit"
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-xs font-bold ${
        primary ? 'bg-[#173c2c] text-white' : danger ? 'bg-[#fff1ed] text-[#963b2d]' : 'border border-[#173c2c]/15 bg-white'
      }`}
    >
      {label}
    </button>
  )
}
