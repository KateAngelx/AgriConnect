import { redirect } from 'next/navigation'
import { AuthSplitLayout } from '@/components/auth-layout'
import { currentUser, homeForRole } from '@/server/auth'
import { LoginForm } from './login-form'

export default async function LoginPage({ searchParams }) {
  const user = await currentUser()
  if (user) redirect(homeForRole(user))
  const query = await searchParams
  const registered = query.registered === '1'

  return (
    <AuthSplitLayout
      heroEyebrow="Welcome back"
      heroTitle="Fresh connections start here."
      heroLead="Sign in to manage your marketplace activity, orders, products, or delivery assignments."
      formEyebrow="AgriConnect account"
      formTitle="Sign in"
      formLead="Use your email or phone number and password. Seller and delivery tools unlock after approval."
      banner={
        registered ? (
          <p
            role="status"
            className="rounded-xl border border-[#5dbb38]/30 bg-[#eef8e8] px-4 py-3 text-sm leading-6 text-[#2d5a3a]"
          >
            Your account is registered. Sign in with the credentials you just created.
          </p>
        ) : null
      }
    >
      <LoginForm />
    </AuthSplitLayout>
  )
}
