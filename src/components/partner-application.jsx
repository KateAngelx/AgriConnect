import { AlertBanner, StatusBadge } from '@/components/dashboard-ui'
import { DeliveryApplicationForm, SellerApplicationForm } from '@/components/apply-forms'

const copy = {
  seller: {
    noun: 'seller',
    submitted: 'Your seller application was submitted. An administrator will review it before seller tools unlock.',
    pending: 'You cannot submit another seller application until this one is approved or rejected.',
    rejected: 'Your previous seller application was rejected.',
    freshTitle: 'We only collect basic business details. Save a draft if you need to finish later.',
  },
  delivery: {
    noun: 'delivery',
    submitted: 'Your delivery application was submitted. An administrator will review it before delivery tools unlock.',
    pending: 'You cannot submit another delivery application until this one is approved or rejected.',
    rejected: 'Your previous delivery application was rejected.',
    freshTitle: 'No documents are required yet. Save a draft if you need to finish later.',
  },
}

export function PartnerApplication({ kind, userName, applications, submitted }) {
  const text = copy[kind]
  const mine = applications.filter((item) => item.applicationType === kind)
  const active = mine.find((item) => ['pending', 'under-review'].includes(item.status))
  const needsInfo = mine.find((item) => item.status === 'needs-info')
  const draft = mine.find((item) => item.status === 'draft')
  const latest = mine[0]
  const Form = kind === 'seller' ? SellerApplicationForm : DeliveryApplicationForm

  return (
    <div className="space-y-4">
      {submitted ? <AlertBanner tone="success">{text.submitted} You will get a notification when the status changes.</AlertBanner> : null}
      {active ? (
        <div>
          <StatusBadge status={active.status} />
          <p className="mt-3 text-sm leading-6 text-[#5c6f62]">
            Your application is {active.status.replaceAll('-', ' ')}. {text.pending}
          </p>
          {active.adminNote ? <p className="mt-3 rounded-xl bg-[#f3f8ef] px-4 py-3 text-sm text-[#5c6f62]">{active.adminNote}</p> : null}
        </div>
      ) : needsInfo ? (
        <>
          <AlertBanner tone="warning">
            Additional information is required before your application can continue.
            {needsInfo.adminNote ? ` ${needsInfo.adminNote}` : ''}
          </AlertBanner>
          <Form defaultName={userName} draft={needsInfo.payload} />
        </>
      ) : latest?.status === 'rejected' ? (
        <>
          <AlertBanner tone="error">
            {text.rejected}
            {latest.adminNote ? ` Note: ${latest.adminNote}` : ' You may submit a new application below.'}
          </AlertBanner>
          <Form defaultName={userName} draft={draft?.payload} />
        </>
      ) : (
        <>
          <p className="text-sm leading-6 text-[#5c6f62]">{text.freshTitle}</p>
          <Form defaultName={userName} draft={draft?.payload} />
        </>
      )}
    </div>
  )
}
