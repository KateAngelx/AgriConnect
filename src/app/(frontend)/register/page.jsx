import { AuthSplitLayout } from '@/components/auth-layout'
import { RegisterForm } from './register-form'

export default function RegisterPage() {
  return (
    <AuthSplitLayout
      heroEyebrow="Join AgriConnect"
      heroTitle="Shop fresh produce from local farms."
      heroLead="Create a free buyer account, browse the marketplace, and apply to sell or deliver after sign-in."
      heroImage="https://images.unsplash.com/photo-1609554259810-ad331c1a9519?auto=format&fit=crop&w=1400&q=85"
      formEyebrow="New account"
      formTitle="Create your account"
      formLead="Sign up with email. Add an optional mobile number for delivery updates at checkout."
    >
      <RegisterForm />
    </AuthSplitLayout>
  )
}
