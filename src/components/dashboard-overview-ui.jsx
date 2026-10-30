import Link from 'next/link'
import { DashboardIcon } from '@/components/dashboard-icons'
import { formatTimeAgo } from '@/lib/dashboard-format'
import { StatusBadge } from '@/components/dashboard-ui'

const iconTones = {
  green: 'bg-[#e8f5e3] text-[#2e7d32]',
  blue: 'bg-[#e3f2fd] text-[#1565c0]',
  amber: 'bg-[#fff8e1] text-[#f9a825]',
  teal: 'bg-[#e0f2f1] text-[#00897b]',
  slate: 'bg-[#f1f3f4] text-[#455a64]',
}

export function DashboardHero({ label, title, description, actionHref, actionLabel, imageUrl }) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-[#173c2c]/8 bg-[linear-gradient(105deg,#e8f5e3_0%,#f4faf0_45%,#ffffff_100%)] shadow-sm">
      <div className="relative z-10 flex flex-col gap-4 p-5 sm:gap-5 sm:p-7 md:max-w-xl md:p-8 lg:max-w-2xl">
        <p className="page-eyebrow text-[#4f8d3b]">{label}</p>
        <h1 className="text-2xl font-bold tracking-tight text-[#142016] sm:text-3xl">{title}</h1>
        <p className="text-sm leading-6 text-[#65766d] sm:text-base">{description}</p>
        {actionHref && actionLabel ? (
          <Link
            href={actionHref}
            className="inline-flex w-fit rounded-full bg-[#2e7d32] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#1b5e20]"
          >
            {actionLabel} →
          </Link>
        ) : null}
      </div>
      {imageUrl ? (
        <div
          className="pointer-events-none absolute bottom-0 right-0 hidden h-full w-[min(42%,320px)] bg-cover bg-center opacity-90 md:block"
          style={{
            backgroundImage: `linear-gradient(90deg,#f4faf0 0%,transparent 35%),url('${imageUrl}')`,
            maskImage: 'linear-gradient(90deg, transparent 0%, black 40%)',
          }}
          aria-hidden="true"
        />
      ) : null}
    </section>
  )
}

export function MetricTile({ label, value, hint, icon = 'grid', tone = 'green' }) {
  const toneClass = iconTones[tone] || iconTones.green
  return (
    <div className="min-h-28 flex flex-col items-start gap-3 rounded-xl border border-[#173c2c]/8 bg-white p-3.5 shadow-sm sm:min-h-32 sm:flex-row sm:p-4">
      <div className={`grid size-10 shrink-0 place-items-center rounded-full sm:size-11 ${toneClass}`}>
        <DashboardIcon name={icon} className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-[#65766d]">{label}</p>
        <p className="mt-1 text-2xl font-bold leading-none text-[#142016] sm:text-[1.7rem]">{value}</p>
        {hint ? <p className="mt-1 text-xs text-[#4f8d3b]">{hint}</p> : null}
      </div>
    </div>
  )
}

export function PanelHeader({ title, description, href, linkLabel = 'View all' }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-[#173c2c]/8 px-5 py-4">
      <div>
        <h2 className="text-base font-bold text-[#142016]">{title}</h2>
        {description ? <p className="mt-1 text-sm text-[#65766d]">{description}</p> : null}
      </div>
      {href ? (
        <Link href={href} className="shrink-0 text-sm font-bold text-[#4f8d3b] hover:text-[#2e7d32]">
          {linkLabel} →
        </Link>
      ) : null}
    </div>
  )
}

export function OverviewPanel({ title, description, href, linkLabel, children, className = '' }) {
  return (
    <section className={`overflow-hidden rounded-2xl border border-[#173c2c]/8 bg-white shadow-sm ${className}`}>
      {title ? <PanelHeader title={title} description={description} href={href} linkLabel={linkLabel} /> : null}
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  )
}

export function UserAvatar({ name, className = 'size-9' }) {
  const initials = String(name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
  return (
    <span
      className={`${className} grid shrink-0 place-items-center rounded-full bg-[#e8f5e3] text-xs font-bold text-[#2e7d32]`}
    >
      {initials || '?'}
    </span>
  )
}

export function NotificationFeed({ notes, emptyMessage = 'No recent updates.' }) {
  return (
    <OverviewPanel title="Recent updates" href="/notifications" linkLabel="View all">
      {notes.length ? (
        <ul className="space-y-4">
          {notes.map((note) => (
            <li key={note.id} className="flex gap-3">
              <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-[#f1f3f4] text-[#455a64]">
                <DashboardIcon name="bell" className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[#142016]">{note.title}</p>
                <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-[#65766d]">{note.body}</p>
                <p className="mt-1 text-[11px] text-[#8a958c]">{formatTimeAgo(note.createdAt)}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-[#65766d]">{emptyMessage}</p>
      )}
    </OverviewPanel>
  )
}

export function QuickActions({ actions }) {
  return (
    <OverviewPanel title="Quick actions">
      <div className="grid gap-3 sm:grid-cols-2">
        {actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="flex items-center gap-3 rounded-xl border border-[#173c2c]/10 bg-[#fafbfa] px-4 py-3 text-sm font-bold text-[#142016] transition hover:border-[#5dbb38]/40 hover:bg-[#f4faf0]"
          >
            <span className="grid size-9 place-items-center rounded-full bg-white text-[#2e7d32] shadow-sm">
              <DashboardIcon name={action.icon} className="size-4" />
            </span>
            {action.label}
          </Link>
        ))}
      </div>
    </OverviewPanel>
  )
}

export function ActivityBars({ title, series }) {
  const max = Math.max(...series.map((item) => item.value), 1)
  return (
    <OverviewPanel title={title}>
      <div className="flex h-36 items-end justify-between gap-2">
        {series.map((item) => (
          <div key={item.label} className="flex flex-1 flex-col items-center gap-2">
            <div
              className="w-full max-w-[2.5rem] rounded-t-md bg-[#a5d6a7] transition-all"
              style={{ height: `${Math.max(8, (item.value / max) * 100)}%` }}
              title={`${item.label}: ${item.value}`}
            />
            <span className="text-[10px] font-medium text-[#65766d]">{item.label}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-[#65766d]">Orders placed in the last 7 days</p>
    </OverviewPanel>
  )
}

export function PromoBanner({ title, body, href, actionLabel, imageUrl }) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-[#173c2c]/8 shadow-sm">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `linear-gradient(135deg,rgba(232,245,227,.95),rgba(255,255,255,.88)),url('${imageUrl}')`,
        }}
        aria-hidden="true"
      />
      <div className="relative p-6">
        <h2 className="text-lg font-bold text-[#142016]">{title}</h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-[#65766d]">{body}</p>
        <Link
          href={href}
          className="mt-4 inline-flex rounded-full bg-[#173c2c] px-5 py-2.5 text-sm font-bold text-white hover:opacity-90"
        >
          {actionLabel} →
        </Link>
      </div>
    </section>
  )
}

export function ApplicationRow({ name, role, date, status }) {
  return (
    <tr className="hover:bg-[#fafbfa]">
      <td className="px-5 py-3">
        <div className="flex items-center gap-3">
          <UserAvatar name={name} />
          <div>
            <p className="font-semibold text-[#142016]">{name}</p>
            <p className="text-xs capitalize text-[#65766d]">{role}</p>
          </div>
        </div>
      </td>
      <td className="px-5 py-3 text-sm text-[#65766d]">{date}</td>
      <td className="px-5 py-3">
        <StatusBadge status={status} />
      </td>
    </tr>
  )
}

export function OrderRow({ reference, buyer, seller, total, status }) {
  return (
    <tr className="hover:bg-[#fafbfa]">
      <td className="px-5 py-3 font-medium text-[#142016]">{reference}</td>
      <td className="px-5 py-3 text-sm text-[#65766d]">{buyer}</td>
      <td className="px-5 py-3 text-sm text-[#65766d]">{seller}</td>
      <td className="px-5 py-3 text-sm font-semibold">{total}</td>
      <td className="px-5 py-3">
        <StatusBadge status={status} />
      </td>
    </tr>
  )
}
