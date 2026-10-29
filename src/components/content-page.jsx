import { SiteShell } from './site-shell'
export function ContentPage({ eyebrow, title, intro, sections }) {
  return (
    <SiteShell>
      <main className="-mt-16">
        <section className="bg-[linear-gradient(90deg,rgba(9,30,16,.91),rgba(9,30,16,.48)),url('https://images.unsplash.com/photo-1609554259810-ad331c1a9519?auto=format&fit=crop&w=1800&q=85')] bg-cover bg-center text-white">
          <div className="mx-auto max-w-6xl px-5 pb-20 pt-40 lg:px-8">
            <p className="page-eyebrow text-[#9de76d]">{eyebrow}</p>
            <h1 className="page-title mt-3 max-w-4xl text-4xl sm:text-5xl lg:text-6xl">{title}</h1>
            <p className="page-lead mt-5 max-w-3xl text-lg text-white/75">{intro}</p>
          </div>
        </section>
        <div className="mx-auto max-w-6xl px-5 py-16 lg:px-8">
          <div className="grid gap-5 md:grid-cols-2">
            {sections.map((section, index) => (
              <section
                key={section.title}
                className={`rounded-[1.75rem] border border-black/5 p-8 ${index === 0 ? 'bg-[#59b937] text-white' : 'bg-white'}`}
              >
                <span
                  className={`text-sm font-bold ${index === 0 ? 'text-white/65' : 'text-[#59b937]'}`}
                >
                  0{index + 1}
                </span>
                <h2 className="page-section-title mt-4 text-2xl">{section.title}</h2>
                <p className={`page-lead mt-3 ${index === 0 ? 'text-white/75' : 'text-[#647066]'}`}>
                  {section.body}
                </p>
                {section.points && (
                  <ul className="mt-5 space-y-3">
                    {section.points.map((point) => (
                      <li
                        key={point}
                        className={`flex gap-3 text-sm leading-6 ${index === 0 ? 'text-white/80' : 'text-[#476354]'}`}
                      >
                        <span
                          className={`mt-2 size-1.5 shrink-0 rounded-full ${index === 0 ? 'bg-white' : 'bg-[#59b937]'}`}
                        />
                        {point}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        </div>
      </main>
    </SiteShell>
  )
}
