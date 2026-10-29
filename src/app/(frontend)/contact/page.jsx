import { SiteShell } from '@/components/site-shell'
const faqs = [
  [
    'Do I need an account to browse?',
    'No. Visitors can browse active products, categories, and approved seller profiles without signing in.',
  ],
  [
    'When is an account required?',
    'A buyer account is required for cart, checkout, orders, wishlist, notifications, and other private features.',
  ],
  [
    'How do I become a seller?',
    'Choose Seller during registration and submit the requested farm or business information. Selling tools remain restricted until approval.',
  ],
  [
    'Are pickup and delivery always available?',
    'No. Each product identifies the options supported by its seller. Delivery coverage and fees must be confirmed during checkout.',
  ],
  [
    'Which payments are supported?',
    'Only payment methods shown as configured during checkout are available. AgriConnect does not present unconfigured electronic payments as active.',
  ],
  [
    'Why does approval take time?',
    'Seller and delivery applications require administrative review. Additional information may be requested before a decision.',
  ],
]
export default function ContactPage() {
  return (
    <SiteShell>
      <main className="mx-auto max-w-6xl px-5 py-16 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr]">
          <section>
            <p className="page-eyebrow text-[#4f8d3b]">Contact and support</p>
            <h1 className="page-title mt-2 text-4xl sm:text-5xl">How can we help?</h1>
            <p className="page-lead mt-4 text-[#65766d]">
              For marketplace questions, account concerns, or privacy inquiries, contact the support
              team using the channel below.
            </p>
            <a
              href="mailto:support@agriconnect.ph"
              className="mt-7 inline-block rounded-full bg-[#173c2c] px-6 py-3 font-semibold text-white"
            >
              Email support
            </a>
            <p className="mt-4 text-sm text-[#65766d]">
              A persistent support-ticket form will be enabled with the authenticated support
              workflow.
            </p>
          </section>
          <section id="faq">
            <h2 className="text-3xl font-semibold">Frequently asked questions</h2>
            <div className="mt-6 divide-y divide-[#173c2c]/10 rounded-3xl border border-[#173c2c]/10 bg-white px-6">
              {faqs.map(([question, answer]) => (
                <details key={question} className="group py-5">
                  <summary className="cursor-pointer list-none font-semibold">
                    {question}
                    <span className="float-right text-[#4f8d3b]">+</span>
                  </summary>
                  <p className="mt-3 pr-8 text-sm leading-6 text-[#65766d]">{answer}</p>
                </details>
              ))}
            </div>
          </section>
        </div>
      </main>
    </SiteShell>
  )
}
