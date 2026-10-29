/** Shared auth pages: login, register, verify phone, forgot password. */

export const authInputClass =
  'mt-2 w-full rounded-2xl border border-black/10 bg-[#f8f8f3] px-4 py-3.5 text-[#142016] outline-none transition focus:border-[#5dbb38] focus:ring-2 focus:ring-[#5dbb38]/20'

export const authLabelClass = 'text-sm font-bold text-[#243126]'

export const authPrimaryButtonClass =
  'w-full rounded-full bg-[#5dbb38] px-5 py-4 font-bold text-white transition hover:bg-[#4fa832] disabled:opacity-60'

export const authCardClass =
  'w-full max-w-md rounded-[2rem] bg-white p-7 shadow-[0_24px_70px_rgba(10,30,17,.12)] sm:p-10'

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
    <main className="min-h-screen bg-[#132719] text-[#142016]">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        <section
          className="hidden bg-cover bg-center px-10 pb-14 pt-32 text-white lg:flex lg:flex-col lg:justify-end xl:px-14"
          style={{
            backgroundImage: `linear-gradient(90deg,rgba(8,31,15,.78),rgba(8,31,15,.25)),url('${heroImage}')`,
          }}
        >
          <p className="page-eyebrow text-[#9de76d]">{heroEyebrow}</p>
          <h1 className="page-title mt-3 max-w-xl text-4xl xl:text-5xl">{heroTitle}</h1>
          <p className="page-lead mt-4 max-w-lg text-white/75">{heroLead}</p>
        </section>

        <section className="relative flex items-center justify-center bg-[#f7f7f2] px-5 py-12 lg:py-16">
          <AuthCloseButton />
          <div className={authCardClass}>
            <p className="page-eyebrow text-[#5dbb38]">{formEyebrow}</p>
            <h2 className="page-title mt-2 text-3xl sm:text-4xl">{formTitle}</h2>
            {formLead ? <p className="page-lead mt-3 text-sm text-[#647066]">{formLead}</p> : null}
            {banner ? <div className="mt-5">{banner}</div> : null}
            <div className="mt-8">{children}</div>
          </div>
        </section>
      </div>
    </main>
  )
}
