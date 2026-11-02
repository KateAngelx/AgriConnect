import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/dashboard-shell'
import { EmptyState, SecondaryButton } from '@/components/dashboard-ui'
import { formatTimeAgo } from '@/lib/dashboard-format'
import { readAllNotificationsAction, readNotificationAction } from '@/app/(frontend)/notifications/actions'
import { currentUser } from '@/server/auth'
import { listNotifications } from '@/server/notifications'

export default async function NotificationsPage() {
  const user = await currentUser()
  if (!user) redirect('/login')
  const notes = await listNotifications(user.id)
  const unread = notes.filter((note) => !note.read).length

  return (
    <DashboardShell user={user} title="Notifications" subtitle="Orders, approvals, payments, and deliveries.">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-brand-muted">
          {unread ? `${unread} unread update${unread === 1 ? '' : 's'}` : 'No unread updates'}
        </p>
        <form action={readAllNotificationsAction}>
          <SecondaryButton type="submit" disabled={!unread}>
            Mark all read
          </SecondaryButton>
        </form>
      </div>

      {notes.length ? (
        <ul className="ui-card divide-y divide-brand-800/10">
          {notes.map((note) => (
            <li key={note.id} className={`px-5 py-4 ${note.read ? '' : 'bg-brand-50/70'}`}>
              <div className="flex flex-wrap items-center gap-2">
                {!note.read ? <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-semibold text-brand-800">New</span> : null}
                <h2 className="text-sm font-semibold text-brand-900">{note.title}</h2>
              </div>
              <p className="mt-1 text-sm leading-6 text-brand-muted">{note.body}</p>
              <p className="mt-1 text-xs text-brand-muted">{formatTimeAgo(note.createdAt)}</p>
              <div className="mt-3 flex flex-wrap gap-4 text-sm font-semibold">
                {note.href ? (
                  <a href={note.href} className="text-brand-700">
                    View details
                  </a>
                ) : null}
                {!note.read ? (
                  <form action={readNotificationAction}>
                    <input type="hidden" name="id" value={note.id} />
                    <button type="submit" className="text-brand-900 hover:underline">
                      Mark read
                    </button>
                  </form>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="No updates">You are all caught up.</EmptyState>
      )}
    </DashboardShell>
  )
}