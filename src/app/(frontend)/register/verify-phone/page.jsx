import { redirect } from 'next/navigation'
import { AuthSplitLayout } from '@/components/auth-layout'
import { normalizePhilippinePhone } from '@/lib/phone'
import { VerifyPhoneForm } from '@/app/(frontend)/register/verify-phone/verify-phone-form'

export default async function VerifyPhonePage({ searchParams }) {
  const params = await searchParams
  const phone = normalizePhilippinePhone(params.phone || '')
  if (!phone) redirect('/register')
  const sendError = typeof params.sendError === 'string' ? params.sendError : ''
  const initialMessage =
    params.sent === '1'
      ? 'Verification code sent. Check SMS (PhilSMS) or use dev bypass code 123456 when enabled.'
      : ''

  return (
    <AuthSplitLayout
      heroEyebrow="Secure sign-up"
      heroTitle="Confirm your mobile number."
      heroLead="We send a one-time code when SMS is configured in Supabase. Test numbers use a fixed code without SMS."
      formEyebrow="Phone verification"
      formTitle="Verify your phone"
      formLead={`Enter the code for ${phone}. Phone sign-in stays disabled until verification succeeds.`}
    >
      <VerifyPhoneForm phone={phone} initialMessage={initialMessage} initialSendError={sendError} />
    </AuthSplitLayout>
  )
}
