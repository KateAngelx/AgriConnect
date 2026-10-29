export function StatCard({ label, value, hint }) {
  return (
    <div className="ui-card p-5">
      <p className="page-eyebrow text-[#647066] normal-case">{label}</p>
      <p className="mt-2 text-3xl font-bold text-[#142016]">{value}</p>
      {hint ? <p className="mt-1 text-sm text-[#647066]">{hint}</p> : null}
    </div>
  )
}

export function DashboardPanel({ title, description, children, action }) {
  return (
    <section className="ui-card overflow-hidden">
      {(title || action) && (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#173c2c]/8 px-5 py-4 sm:px-6">
          <div>
            {title ? <h2 className="text-base font-bold text-[#142016]">{title}</h2> : null}
            {description ? <p className="mt-1 text-sm text-[#647066]">{description}</p> : null}
          </div>
          {action}
        </div>
      )}
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  )
}

export function EmptyState({ title, children, action }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#173c2c]/15 bg-white px-6 py-12 text-center">
      <h3 className="text-lg font-bold text-[#142016]">{title}</h3>
      {children ? <div className="mt-2 text-sm text-[#647066]">{children}</div> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}

export function AlertBanner({ tone = 'warning', children }) {
  const styles =
    tone === 'error'
      ? 'border-red-200 bg-brand-error text-red-800'
      : tone === 'success'
        ? 'border-brand-100 bg-brand-50 text-brand-700'
        : 'border-amber-200/70 bg-brand-warning text-amber-800'
  return <p className={`rounded-2xl border px-4 py-3 text-sm leading-6 ${styles}`}>{children}</p>
}

export function StatusBadge({ status }) {
  const normalized = String(status || '').toLowerCase()
  const styles =
    normalized === 'approved' || normalized === 'paid' || normalized === 'completed' || normalized === 'active'
      ? 'bg-brand-50 text-brand-700'
        : normalized === 'pending' ||
            normalized === 'open' ||
            normalized.includes('awaiting') ||
            normalized.includes('review')
          ? 'bg-brand-warning text-amber-800'
          : normalized === 'rejected' || normalized === 'suspended' || normalized === 'cancelled'
            ? 'bg-brand-error text-red-800'
            : normalized === 'needs-info' || normalized === 'draft'
              ? 'bg-blue-50 text-blue-800'
              : normalized.includes('transit') || normalized.includes('preparing') || normalized.includes('confirmed')
              ? 'bg-brand-info text-blue-700'
              : 'bg-[#f7f7f2] text-[#647066]'
  return (
    <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold capitalize ${styles}`}>
      {String(status || '').replaceAll('-', ' ')}
    </span>
  )
}

export function DataTable({ columns, children }) {
  return (
    <div className="ui-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-[#f7f7f2] text-xs uppercase tracking-wider text-[#647066]">
            <tr>
              {columns.map((col) => (
                <th key={col} className="px-5 py-4 font-bold">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#173c2c]/8">{children}</tbody>
        </table>
      </div>
    </div>
  )
}

export function ListRow({ title, meta, badge, amount, actions }) {
  return (
    <article className="ui-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        {badge}
        {title ? <div className="mt-1 text-lg font-bold text-[#142016]">{title}</div> : null}
        {meta ? <p className="mt-1 text-sm text-[#647066]">{meta}</p> : null}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-3">
        {amount ? <strong className="text-xl text-[#142016]">{amount}</strong> : null}
        {actions}
      </div>
    </article>
  )
}

export function PrimaryButton({ className = '', ...props }) {
  return (
    <button
      className={`rounded-full bg-brand-500 px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50 ${className}`}
      {...props}
    />
  )
}

export function SecondaryButton({ className = '', ...props }) {
  return (
    <button
      className={`rounded-full border border-[#173c2c]/15 bg-white px-5 py-2.5 text-sm font-bold text-[#142016] transition hover:bg-[#f7f7f2] ${className}`}
      {...props}
    />
  )
}

export function DangerButton({ className = '', ...props }) {
  return (
    <button
      className={`rounded-full bg-[#fff1ed] px-5 py-2.5 text-sm font-bold text-[#963b2d] transition hover:opacity-90 ${className}`}
      {...props}
    />
  )
}

export function DarkButton({ className = '', ...props }) {
  return (
    <button
      className={`rounded-full bg-[#142a19] px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90 ${className}`}
      {...props}
    />
  )
}

export function FieldInput({ className = '', ...props }) {
  return (
    <input
      className={`ui-field ${className}`}
      {...props}
    />
  )
}
