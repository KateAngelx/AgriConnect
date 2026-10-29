'use client'

import { useActionState } from 'react'
import { resendPhoneOtpAction, verifyPhoneAction } from '@/app/(frontend)/register/verify-phone/actions'
import { authInputClass, authLabelClass, authPrimaryButtonClass } from '@/components/auth-layout'

export function VerifyPhoneForm({ phone, initialMessage = '', initialSendError = '' }) {
  const [verifyState, verifyAction, verifyPending] = useActionState(verifyPhoneAction, { error: '' })
  const [resendState, resendAction, resendPending] = useActionState(resendPhoneOtpAction, {
    error: initialSendError,
    message: initialMessage,
  })

  return (
    <div className="space-y-6">
      <form action={resendAction} className="rounded-2xl border border-[#173c2c]/10 bg-[#f8f8f3] p-4">
        <input type="hidden" name="phone" value={phone} />
        <p className="text-sm text-[#647066]">
          Request a code for <strong className="text-[#142016]">{phone}</strong> (Supabase SMS, test OTP, or local dev
          bypass when enabled).
        </p>
        {resendState.message ? (
          <p className="mt-2 text-sm font-bold text-[#4b9f30]">{resendState.message}</p>
        ) : null}
        {resendState.error ? (
          <p role="alert" className="mt-2 text-sm text-[#963b2d]">
            {resendState.error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={resendPending}
          className="mt-3 text-sm font-bold text-[#4b9f30] disabled:opacity-60"
        >
          {resendPending ? 'Sending…' : 'Send verification code'}
        </button>
      </form>
      <form action={verifyAction} className="space-y-4">
        <input type="hidden" name="phone" value={phone} />
        <div>
          <label htmlFor="token" className={authLabelClass}>
            Verification code
          </label>
          <input
            id="token"
            name="token"
            inputMode="numeric"
            autoComplete="one-time-code"
            minLength={4}
            maxLength={8}
            pattern="[0-9]*"
            placeholder="6-digit code"
            required
            className={authInputClass}
          />
        </div>
        {verifyState.error ? (
          <p role="alert" className="rounded-xl bg-[#fff1ed] px-4 py-3 text-sm text-[#963b2d]">
            {verifyState.error}
          </p>
        ) : null}
        <button type="submit" disabled={verifyPending} className={authPrimaryButtonClass}>
          {verifyPending ? 'Verifying…' : 'Verify and continue →'}
        </button>
      </form>
    </div>
  )
}
