import { AuthSplitLayout } from '@/components/auth-layout'

export default function ForgotPasswordPage() {
  return (
    <AuthSplitLayout
      heroEyebrow="Account recovery"
      heroTitle="Reset access safely."
      heroLead="Password recovery depends on how you registered. Email accounts can be reset when outbound email is configured."
      formEyebrow="AgriConnect account"
      formTitle="Reset your password"
      formLead="Automated reset email is not configured yet. Contact support from the email on your account."
    >
      <a
        href="mailto:support@agriconnect.ph?subject=Password%20reset%20request"
        className="inline-block rounded-full bg-[#5dbb38] px-6 py-3.5 font-bold text-white"
      >
        Contact support
      </a>
      <p className="mt-6 text-center text-sm text-[#647066]">
        <a href="/login" className="font-bold text-[#4b9f30]">
          Back to sign in
        </a>
      </p>
    </AuthSplitLayout>
  )
}
