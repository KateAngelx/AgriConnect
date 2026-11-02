import { SiteShell } from './site-shell'

export function ContentPage({ eyebrow, title, intro, sections }) {
  return (
    <SiteShell>
      <main>
        <section className="page-band">
          <div className="page-container">
            <p className="page-eyebrow">{eyebrow}</p>
            <h1 className="page-title mt-2 max-w-4xl text-3xl text-brand-900 sm:text-4xl">{title}</h1>
            <p className="page-lead mt-3 max-w-3xl text-brand-muted">{intro}</p>
          </div>
        </section>
        <div className="page-container page-section">
          <div className="grid gap-4 md:grid-cols-2">
            {sections.map((section, index) => (
              <section key={section.title} className="ui-card p-5 sm:p-6">
                <span className="text-sm font-bold text-brand-600">0{index + 1}</span>
                <h2 className="page-section-title mt-3 text-xl text-brand-900">{section.title}</h2>
                <p className="page-lead mt-2 text-sm text-brand-muted">{section.body}</p>
                {section.points ? (
                  <ul className="mt-4 space-y-2.5">
                    {section.points.map((point) => (
                      <li key={point} className="flex gap-3 text-sm leading-6 text-[#476354]">
                        <span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-500" />
                        {point}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}
          </div>
        </div>
      </main>
    </SiteShell>
  )
}
