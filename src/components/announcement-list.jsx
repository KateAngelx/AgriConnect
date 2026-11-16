import { PagedRows } from '@/components/paged-rows'
import { formatDateTime } from '@/lib/date-time'
import { audienceLabel } from '@/server/announcements'

/** Paged list of administrator announcements. `showAudience` adds who it was sent to (admin view). */
export function AnnouncementList({ items, showAudience = false, empty = 'No announcements yet.' }) {
  if (!items.length) return <p className="px-4 py-6 text-sm text-[#5c6f62]">{empty}</p>
  return (
    <PagedRows className="divide-y divide-[#d5e4d4]">
      {items.map((item) => (
        <li key={item.id} className="px-4 py-3 sm:px-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="font-semibold text-[#142016]">{item.title}</p>
            <p className="text-[12px] text-[#5c6f62]">{item.sentAt ? formatDateTime(item.sentAt) : ''}</p>
          </div>
          <p className="mt-1 whitespace-pre-line text-sm leading-6 text-[#344a3b]">{item.message}</p>
          {showAudience ? (
            <p className="mt-1 text-[12px] text-[#5c6f62]">
              To {audienceLabel[item.audience] || item.audience} · {item.recipientCount} recipient
              {item.recipientCount === 1 ? '' : 's'} · Sent by {item.sentBy}
            </p>
          ) : null}
        </li>
      ))}
    </PagedRows>
  )
}

/** Card wrapper for dashboards. */
export function AnnouncementsPanel({ items }) {
  return (
    <section className="ui-card overflow-hidden">
      <div className="border-b border-[#d5e4d4] px-4 py-3">
        <h2 className="text-[17px] font-semibold text-[#142016]">Announcements</h2>
        <p className="text-[13px] text-[#5c6f62]">Messages from AgriConnect administrators.</p>
      </div>
      <AnnouncementList items={items} empty="No announcements from administrators yet." />
    </section>
  )
}
