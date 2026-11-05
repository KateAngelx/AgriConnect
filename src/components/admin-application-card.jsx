'use client'

import { useRef, useState } from 'react'
import { StatusBadge } from '@/components/dashboard-ui'
import { ConfirmDialog } from '@/components/ui-feedback'

export function AdminApplicationCard({ entry, reviewAction }) {
  const payloadFields = Object.entries(entry.payload || {})
  const decisionRef = useRef(null)
  const [aiHint, setAiHint] = useState('')
  const [aiError, setAiError] = useState('')
  const [aiPending, setAiPending] = useState(false)
  const [confirmation, setConfirmation] = useState(null)
  const confirmedDecision = useRef(false)

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
    if (confirmedDecision.current) {
      confirmedDecision.current = false
      return
    }
    event.preventDefault()
    if (decision === 'approved' || decision === 'rejected') {
      setConfirmation({ decision, verb: decision === 'approved' ? 'approve' : 'reject' })
    }
  }

  function submitDecision() {
    confirmedDecision.current = true
    const decision = confirmation.decision
    setConfirmation(null)
    decisionRef.current.value = decision
    decisionRef.current.form?.requestSubmit()
  }

  return (
    <>
    <li className="w-full px-4 py-4 sm:px-5">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
        <div className="min-w-0">
          <p className="text-base font-bold text-[#142016]">{entry.user?.name || 'Applicant'}</p>
          <p className="mt-0.5 break-words text-sm text-[#65766d]">
            {entry.user?.email || 'No email'} · {entry.applicationType} application
          </p>
          <p className="mt-1 text-xs text-[#65766d]">
            Submitted {entry.createdAt ? new Date(entry.createdAt).toLocaleString('en-PH') : 'date unavailable'}
          </p>
          <details className="mt-3">
            <summary className="w-fit cursor-pointer text-sm font-semibold text-[#2e7d32]">View application details</summary>
            {payloadFields.length ? (
              <dl className="mt-3 grid gap-3 rounded-xl bg-white p-4 sm:grid-cols-2">
                {payloadFields.map(([key, value]) => (
                <div key={key} className="min-w-0">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-[#65766d]">
                    {key.replaceAll(/([A-Z])/g, ' $1')}
                  </dt>
                  <dd className="mt-1 whitespace-pre-wrap break-words text-sm text-[#142016]">
                    {Array.isArray(value) ? value.join(', ') : String(value ?? '—')}
                  </dd>
                </div>
                ))}
              </dl>
            ) : <p className="mt-3 text-sm text-[#65766d]">No additional information was submitted.</p>}
          </details>
        </div>
        <StatusBadge status={entry.status} />
      </div>
      {entry.adminNote ? (
        <p className="mt-3 rounded-lg bg-white px-3 py-2 text-sm text-[#647066]">Note: {entry.adminNote}</p>
      ) : null}
      <div className="mt-3 flex flex-col items-start gap-1 border-l-2 border-[#dceccf] pl-3">
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
            placeholder="Note to the applicant (required for rejection or when requesting additional information)"
            className="w-full rounded-xl border border-[#173c2c]/12 px-3 py-2 text-sm"
          />
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
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
    <ConfirmDialog
      open={Boolean(confirmation)}
      title="Confirm application decision"
      message={confirmation ? `Confirm that you want to ${confirmation.verb} this application?` : ''}
      confirmLabel={confirmation?.verb === 'approve' ? 'Approve application' : 'Reject application'}
      danger={confirmation?.verb === 'reject'}
      onConfirm={submitDecision}
      onCancel={() => setConfirmation(null)}
    />
    </>
  )
}

function ReviewButton({ label, primary, danger, onClick }) {
  return (
    <button
      type="submit"
      onClick={onClick}
      className={`w-full justify-center sm:w-auto ${primary ? 'btn btn-primary' : danger ? 'btn btn-danger' : 'btn btn-secondary'}`}
    >
      {label}
    </button>
  )
}
