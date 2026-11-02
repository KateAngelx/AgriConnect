/** Shared auth pages: login, register, verify phone, forgot password. */

export const authInputClass =
  'ui-field mt-2'

export const authLabelClass = 'text-[13px] font-semibold text-[#1d1d1f]'

export const authPrimaryButtonClass =
  'btn btn-primary w-full'

export const authCardClass =
  'ui-card w-full max-w-md p-5 sm:p-6'

export function AuthCloseButton() {
  return (
    <a
      href="/"
      className="absolute right-6 top-6 grid size-10 place-items-center rounded-full bg-black/5 text-[#142016] transition-colors hover:bg-black/10 sm:right-10 sm:top-10"
      aria-label="Back to homepage"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </a>
  )
}

export function AuthSplitLayout({
  heroEyebrow,
  heroTitle,
  heroLead,
  heroImage = 'https://images.unsplash.com/photo-1777045453423-b9aaf76d6eb6?auto=format&fit=crop&w=1400&q=85',
  formEyebrow,
  formTitle,
  formLead,
  children,
  banner,
}) {
  return (
    <main className="min-h-screen bg-[#f3f8ef] text-[#142016]">
      <div className="grid min-h-screen lg:grid-cols-[0.9fr_1.1fr]">
        <section className="hidden items-end bg-[#ebecef] px-10 py-14 lg:flex">
          <div>
            <p className="text-[13px] font-semibold text-[#248a3d]">{heroEyebrow}</p>
            <h1 className="page-title mt-2 max-w-md text-4xl text-[#1d1d1f]">{heroTitle}</h1>
            <p className="mt-3 max-w-md text-[15px] leading-6 text-[#6e6e73]">{heroLead}</p>
            <img src={heroImage} alt="" className="mt-8 h-44 w-full max-w-md rounded-xl object-cover" />
          </div>
        </section>

        <section className="relative flex items-center justify-center px-5 py-12 pb-[max(3rem,env(safe-area-inset-bottom))] lg:px-8 lg:py-16">
          <AuthCloseButton />
          <div className={authCardClass}>
            <p className="text-[13px] font-semibold text-[#248a3d]">{formEyebrow}</p>
            <h2 className="page-title mt-1 text-2xl text-[#1d1d1f]">{formTitle}</h2>
            {formLead ? <p className="page-lead mt-3 text-sm text-[#647066]">{formLead}</p> : null}
            {banner ? <div className="mt-5">{banner}</div> : null}
            <div className="mt-6">{children}</div>
          </div>
        </section>
      </div>
    </main>
  )
}
