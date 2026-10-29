'use client'

import { useActionState, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { loginAction } from '@/app/(frontend)/login/actions'
import { authInputClass, authLabelClass, authPrimaryButtonClass } from '@/components/auth-layout'

const initialState = { error: '' }

export function LoginForm() {
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || ''
  const [showPassword, setShowPassword] = useState(false)
  const [state, action, pending] = useActionState(loginAction, initialState)

  return (
    <form action={action} className="space-y-5">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <div>
        <label htmlFor="identifier" className={authLabelClass}>
          Email address
        </label>
        <input
          id="identifier"
          name="identifier"
          type="email"
          autoComplete="username"
          required
          className={authInputClass}
          placeholder="you@example.com"
        />
      </div>
      <div>
        <div className="flex items-center justify-between">
          <label htmlFor="password" className={authLabelClass}>
            Password
          </label>
          <a href="/forgot-password" className="text-xs font-semibold text-[#4b9f30]">
            Forgot password?
          </a>
        </div>
        <div className="relative mt-2">
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            required
            className={`${authInputClass} mt-0 pr-20`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="absolute inset-y-0 right-4 text-xs font-bold text-[#4b9f30]"
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>
      {state.error ? (
        <p role="alert" className="rounded-xl bg-[#fff1ed] px-4 py-3 text-sm text-[#963b2d]">
          {state.error}
        </p>
      ) : null}
      <button type="submit" disabled={pending} className={authPrimaryButtonClass}>
        {pending ? 'Signing in…' : 'Sign in →'}
      </button>
      <p className="text-center text-sm text-[#647066]">
        New to AgriConnect?{' '}
        <a href="/register" className="font-bold text-[#4b9f30]">
          Create an account
        </a>
      </p>
    </form>
  )
}
