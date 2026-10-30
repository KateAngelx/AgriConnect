'use client'

import { useActionState, useState } from 'react'
import { useRouter } from 'next/navigation'
import { applyDeliveryAction, applySellerAction } from '@/app/(frontend)/account/actions'
import { ConfirmDialog } from '@/components/ui-feedback'

const field =
  'mt-2 w-full rounded-xl border border-[#173c2c]/12 bg-white px-4 py-2.5 text-sm outline-none ring-[#5dbb38]/30 focus:ring-2'

const formCopy = {
  saveDraft: 'Save draft',
  submitSeller: 'Submit seller application',
  submitDelivery: 'Submit delivery application',
  cancel: 'Cancel',
  cancelConfirm: 'Leave this page? Unsaved changes may be lost.',
  saving: 'Saving…',
  submitting: 'Submitting…',
  draftSaved: 'Draft saved.',
}

function FormActions({ pending, submitLabel, formId, t }) {
  const router = useRouter()
  const [cancelOpen, setCancelOpen] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  function requestCancel() {
    const form = document.getElementById(formId)
    const data = form ? new FormData(form) : null
    const changed = data ? [...data.values()].some((value) => String(value).trim()) : false
    setHasChanges(changed)
    if (changed) setCancelOpen(true)
    else router.push('/account')
  }

  return (
    <>
    <div className="flex flex-wrap items-center gap-3 pt-2">
      <button
        type="submit"
        name="intent"
        value="submit"
        disabled={pending}
        className="rounded-full bg-[#5dbb38] px-6 py-3 text-sm font-bold text-white disabled:opacity-60"
      >
        {pending ? t.submitting : submitLabel} →
      </button>
      <button
        type="submit"
        name="intent"
        value="draft"
        disabled={pending}
        className="rounded-full border border-[#173c2c]/15 bg-white px-6 py-3 text-sm font-bold text-[#142016] disabled:opacity-60"
      >
        {pending ? t.saving : t.saveDraft}
      </button>
      <button type="button" onClick={requestCancel} className="text-sm font-bold text-[#647066] hover:text-[#4b9f30]">
        {t.cancel}
      </button>
    </div>
    {hasChanges ? (
      <ConfirmDialog
        open={cancelOpen}
        title="Discard application changes?"
        message={t.cancelConfirm}
        confirmLabel="Leave page"
        danger
        onConfirm={() => router.push('/account')}
        onCancel={() => setCancelOpen(false)}
      />
    ) : null}
    </>
  )
}

function Feedback({ state, t }) {
  if (state.error) {
    return (
      <p role="alert" className="rounded-xl bg-[#fff1ed] px-4 py-3 text-sm text-[#963b2d]">
        {state.error}
      </p>
    )
  }
  if (state.draft) {
    return (
      <p role="status" className="rounded-xl bg-[#eef8e8] px-4 py-3 text-sm text-[#3f8d29]">
        {t.draftSaved}
      </p>
    )
  }
  return null
}

export function SellerApplicationForm({ defaultName, draft = {} }) {
  const t = formCopy
  const [state, action, pending] = useActionState(applySellerAction, { error: '' })
  const formId = 'seller-application-form'

  return (
    <form id={formId} action={action} className="space-y-4">
      <div>
        <label className="text-sm font-bold" htmlFor="farmName">
          Farm or shop name <span className="text-[#963b2d]">*</span>
        </label>
        <input id="farmName" name="farmName" required defaultValue={draft.farmName ?? ''} className={field} />
      </div>
      <div>
        <label className="text-sm font-bold" htmlFor="applicantName">
          Applicant name <span className="text-[#963b2d]">*</span>
        </label>
        <input
          id="applicantName"
          name="applicantName"
          required
          defaultValue={draft.applicantName ?? defaultName}
          className={field}
        />
      </div>
      <div>
        <label className="text-sm font-bold" htmlFor="contactNumber">
          Contact number <span className="text-[#963b2d]">*</span>
        </label>
        <input
          id="contactNumber"
          name="contactNumber"
          required
          defaultValue={draft.contactNumber ?? ''}
          className={field}
          placeholder="09XX XXX XXXX"
        />
      </div>
      <div>
        <label className="text-sm font-bold" htmlFor="location">
          Location <span className="text-[#963b2d]">*</span>
        </label>
        <input
          id="location"
          name="location"
          required
          defaultValue={draft.location ?? ''}
          className={field}
          placeholder="Province or city"
        />
      </div>
      <div>
        <label className="text-sm font-bold" htmlFor="categories">
          Product categories
        </label>
        <input
          id="categories"
          name="categories"
          defaultValue={draft.categories ?? ''}
          className={field}
          placeholder="Vegetables, fruits, rice, etc."
        />
      </div>
      <div>
        <label className="text-sm font-bold" htmlFor="description">
          Business description <span className="text-[#963b2d]">*</span>
        </label>
        <textarea
          id="description"
          name="description"
          required
          rows={4}
          defaultValue={draft.description ?? ''}
          className={field}
          placeholder="Briefly describe what you grow or sell."
        />
      </div>
      <Feedback state={state} t={t} />
      <FormActions pending={pending} submitLabel={t.submitSeller} formId={formId} t={t} />
    </form>
  )
}

export function DeliveryApplicationForm({ defaultName, draft = {} }) {
  const t = formCopy
  const [state, action, pending] = useActionState(applyDeliveryAction, { error: '' })
  const formId = 'delivery-application-form'

  return (
    <form id={formId} action={action} className="space-y-4">
      <div>
        <label className="text-sm font-bold" htmlFor="fullName">
          Full name <span className="text-[#963b2d]">*</span>
        </label>
        <input id="fullName" name="fullName" required defaultValue={draft.fullName ?? defaultName} className={field} />
      </div>
      <div>
        <label className="text-sm font-bold" htmlFor="contactNumber">
          Contact number <span className="text-[#963b2d]">*</span>
        </label>
        <input
          id="contactNumber"
          name="contactNumber"
          required
          defaultValue={draft.contactNumber ?? ''}
          className={field}
          placeholder="09XX XXX XXXX"
        />
      </div>
      <div>
        <label className="text-sm font-bold" htmlFor="serviceArea">
          Service area <span className="text-[#963b2d]">*</span>
        </label>
        <input
          id="serviceArea"
          name="serviceArea"
          required
          defaultValue={draft.serviceArea ?? ''}
          className={field}
          placeholder="Cities or provinces you can cover"
        />
      </div>
      <div>
        <label className="text-sm font-bold" htmlFor="experience">
          Delivery experience (optional)
        </label>
        <textarea
          id="experience"
          name="experience"
          rows={3}
          defaultValue={draft.experience ?? ''}
          className={field}
          placeholder="Motorcycle, van, prior courier work, etc."
        />
      </div>
      <Feedback state={state} t={t} />
      <FormActions pending={pending} submitLabel={t.submitDelivery} formId={formId} t={t} />
    </form>
  )
}
