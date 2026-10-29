'use client'

import { useActionState } from 'react'
import { registerAction } from '@/app/(frontend)/register/actions'
import { authInputClass, authLabelClass, authPrimaryButtonClass } from '@/components/auth-layout'

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerAction, { error: '' })

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="authMethod" value="email" />
      <div>
        <label htmlFor="name" className={authLabelClass}>
          Full name
        </label>
        <input id="name" name="name" required autoComplete="name" className={authInputClass} />
      </div>
      <div>
        <label htmlFor="email" className={authLabelClass}>
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className={authInputClass}
        />
      </div>
      <div>
        <label htmlFor="phoneOptional" className={authLabelClass}>
          Mobile number (optional, for delivery contact)
        </label>
        <input
          id="phoneOptional"
          name="phone"
          type="tel"
          autoComplete="tel"
          placeholder="09XX XXX XXXX"
          className={authInputClass}
        />
      </div>
      <div>
        <label htmlFor="password" className={authLabelClass}>
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          minLength={8}
          className={authInputClass}
        />
      </div>
      <div>
        <label htmlFor="confirmation" className={authLabelClass}>
          Confirm password
        </label>
        <input
          id="confirmation"
          name="confirmation"
          type="password"
          required
          autoComplete="new-password"
          minLength={8}
          className={authInputClass}
        />
      </div>
      <label className="flex items-start gap-3 text-sm text-[#647066]">
        <input type="checkbox" name="terms" value="accepted" required className="mt-1" />
        <span>
          I agree to the{' '}
          <a href="/terms" className="font-semibold text-[#4b9f30]">
            Terms
          </a>{' '}
          and{' '}
          <a href="/privacy" className="font-semibold text-[#4b9f30]">
            Privacy Policy
          </a>
          .
        </span>
      </label>
      {state.error ? (
        <p role="alert" className="rounded-xl bg-[#fff1ed] px-4 py-3 text-sm text-[#963b2d]">
          {state.error}
        </p>
      ) : null}
      <button type="submit" disabled={pending} className={authPrimaryButtonClass}>
        {pending ? 'Creating account…' : 'Create account →'}
      </button>
    </form>
  )
}
