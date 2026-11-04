import { DashboardIcon } from '@/components/dashboard-icons'

export function StatCard({ label, value, hint, icon }) {
  const text = typeof value === 'string' || typeof value === 'number' ? String(value) : ''
  const valueClass = text.length > 12 ? 'text-xl' : 'text-3xl'
  return (
    <div className="ui-card p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-brand-muted">{label}</p>
        {icon ? (
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#e8f5e3] text-[#2e7d32]">
            <DashboardIcon name={icon} className="size-4" />
          </span>
        ) : null}
      </div>
      <p className={`mt-2 font-bold leading-none text-brand-900 ${valueClass}`}>{value}</p>
      {hint ? <p className="mt-2 text-sm text-brand-muted">{hint}</p> : null}
    </div>
  )
}

export function DashboardPanel({ title, description, children, action, fit = false }) {
  return (
    <section className={`ui-card flex flex-col overflow-hidden ${fit ? '' : 'h-[33rem]'}`}>
      {(title || action) && (
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[#d5e4d4] px-4 py-3 sm:px-5">
          <div className="min-w-0">
            {title ? <h2 className="text-[17px] font-semibold text-[#142016]">{title}</h2> : null}
            {description ? <p className="mt-0.5 text-[13px] text-[#5c6f62]">{description}</p> : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      )}
      <div className={fit ? 'p-4 sm:p-5' : 'min-h-0 flex-1 overflow-y-auto p-4 sm:p-5'}>{children}</div>
    </section>
  )
}

export const workGridClass = 'grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 [&>:last-child:nth-child(odd)]:sm:col-span-2'
export const workStackClass = 'grid grid-cols-1 items-stretch gap-4'

export function WorkSection({ title, description, count, href, linkLabel = 'View all', action, toolbar, children, empty }) {
  const isEmpty = count === 0
  return (
    <section className="ui-card flex h-[33rem] flex-col overflow-hidden">
      {toolbar ? <div className="shrink-0 border-b border-[#d5e4d4] bg-[#f7fbf4] px-4 py-3 sm:px-5">{toolbar}</div> : null}
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[#d5e4d4] px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <h2 className="text-[17px] font-semibold text-[#142016]">{title}</h2>
          {description ? <p className="mt-0.5 text-[13px] text-[#5c6f62]">{description}</p> : null}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {typeof count === 'number' ? <p className="text-[13px] font-semibold text-[#2e7d32]">{count}</p> : null}
          {action}
          {href ? <a href={href} className="text-[13px] font-semibold text-[#2e7d32]">{linkLabel}</a> : null}
        </div>
      </div>
      <div className={`flex min-h-0 flex-1 flex-col overflow-y-auto ${isEmpty ? 'px-4 py-4 sm:px-5' : ''}`}>{isEmpty ? empty : children}</div>
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
            : normalized === 'needs-info' || normalized === 'draft' || normalized === 'needs info'
              ? 'bg-blue-50 text-blue-800'
              : normalized.includes('transit') || normalized.includes('preparing') || normalized.includes('confirmed')
              ? 'bg-brand-info text-blue-700'
              : 'bg-brand-page text-brand-muted'
  const label = String(status || '')
    .replaceAll('-', ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[12px] font-semibold ${styles}`}>
      {label}
    </span>
  )
}

export function DataTable({ columns, children, embedded = false }) {
  const table = (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-brand-page text-xs font-semibold text-brand-muted">
          <tr>
            {columns.map((col) => (
              <th key={col} className="px-5 py-3 font-semibold">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-brand-800/8">{children}</tbody>
      </table>
    </div>
  )
  if (embedded) return table
  return <div className="ui-card overflow-hidden">{table}</div>
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
  return <button className={`btn btn-primary ${className}`} {...props} />
}

export function SecondaryButton({ className = '', ...props }) {
  return <button className={`btn btn-secondary ${className}`} {...props} />
}

export function DangerButton({ className = '', ...props }) {
  return <button className={`btn btn-danger ${className}`} {...props} />
}

export function DarkButton({ className = '', ...props }) {
  return <button className={`btn btn-dark ${className}`} {...props} />
}

export function PrimaryLink({ href, className = '', children }) {
  return (
    <a href={href} className={`btn btn-primary ${className}`}>
      {children}
    </a>
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
