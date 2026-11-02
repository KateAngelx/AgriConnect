import { SiteShell } from '@/components/site-shell'

const faqs = [
  [
    'Do I need an account to browse?',
    'No. Visitors can browse active products, categories, and approved seller profiles without signing in.',
  ],
  [
    'When is an account required?',
    'A buyer account is required for the cart, checkout, orders, wishlist, notifications, and other private features.',
  ],
  [
    'How do I become a seller?',
    'Create an account, then apply to sell from your account page. Selling tools stay locked until an administrator approves the application.',
  ],
  [
    'Are pickup and delivery always available?',
    'No. Each product shows the options its seller supports. Delivery coverage and fees are confirmed during checkout.',
  ],
  [
    'Which payments are supported?',
    'Only payment methods shown during checkout are available. Unconfigured electronic payments are not presented as active.',
  ],
  [
    'Why does approval take time?',
    'Seller and delivery applications are reviewed by an administrator. More information may be requested before a decision.',
  ],
]

export default function ContactPage() {
  return (
    <SiteShell>
      <main className="page-container page-section page-open">
        <div className="grid gap-6 lg:grid-cols-[.85fr_1.15fr] lg:gap-8">
          <section>
            <p className="page-eyebrow text-brand-700">Contact and support</p>
            <h1 className="page-title mt-2 text-3xl text-brand-900 sm:text-4xl">How can we help?</h1>
            <p className="page-lead mt-3 text-brand-muted">
              Write to the support team for marketplace questions, account concerns, or privacy inquiries. Include your order reference when you have one.
            </p>
            <a href="mailto:support@agriconnect.ph" className="btn btn-dark mt-6">
              Email support@agriconnect.ph
            </a>
            <div className="mt-6 space-y-3">
              <article id="orders" className="ui-card scroll-mt-24 p-5">
                <h2 className="text-base font-semibold text-brand-900">Orders and issues</h2>
                <p className="mt-2 text-sm leading-6 text-brand-muted">
                  Buyers can follow an order from My orders. Sellers update fulfillment from their order queue. If something looks wrong, email support with the order reference.
                </p>
              </article>
              <article className="ui-card p-5">
                <h2 className="text-base font-semibold text-brand-900">Shipping and delivery</h2>
                <p className="mt-2 text-sm leading-6 text-brand-muted">
                  Pickup and delivery depend on the listing. Read how each role moves an order from placement to completion.
                </p>
                <a href="/how-it-works" className="mt-3 inline-block text-sm font-bold text-brand-700">
                  How it works
                </a>
              </article>
            </div>
          </section>
          <section id="faq" className="scroll-mt-24">
            <h2 className="text-2xl font-semibold text-brand-900">Frequently asked questions</h2>
            <div className="ui-card mt-6 divide-y divide-brand-800/10 px-5">
              {faqs.map(([question, answer]) => (
                <details key={question} className="group py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-brand-900">
                    {question}
                    <span className="text-xl leading-none text-brand-600 transition group-open:rotate-45" aria-hidden="true">
                      +
                    </span>
                  </summary>
                  <p className="mt-2 pr-8 text-sm leading-6 text-brand-muted">{answer}</p>
                </details>
              ))}
            </div>
          </section>
        </div>
      </main>
    </SiteShell>
  )
}
