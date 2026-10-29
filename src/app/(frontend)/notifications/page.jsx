import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/dashboard-shell'
import { DashboardPanel, EmptyState, SecondaryButton } from '@/components/dashboard-ui'
import { readAllNotificationsAction, readNotificationAction } from '@/app/(frontend)/notifications/actions'
import { currentUser } from '@/server/auth'
import { listNotifications } from '@/server/notifications'

export default async function NotificationsPage() {
  const user = await currentUser()
  if (!user) redirect('/login')
  const notes = await listNotifications(user.id)

  return (
    <DashboardShell user={user} title="Updates" subtitle="Order, approval, payment, and delivery notifications.">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[#647066]">Mark items read as you review them.</p>
        <form action={readAllNotificationsAction}>
          <SecondaryButton type="submit">Mark all read</SecondaryButton>
        </form>
      </div>

      {notes.length ? (
        <ul className="space-y-3">
          {notes.map((note) => (
            <li key={note.id}>
              <DashboardPanel
                title={note.title}
                description={note.body}
                action={
                  !note.read ? (
                    <span className="rounded-full bg-[#eef8e8] px-3 py-1 text-xs font-bold text-[#3f8d29]">New</span>
                  ) : null
                }
              >
                <div className="flex flex-wrap gap-4 text-sm font-bold">
                  {note.href ? (
                    <a href={note.href} className="text-[#4b9f30]">
                      Open →
                    </a>
                  ) : null}
                  {!note.read ? (
                    <form action={readNotificationAction}>
                      <input type="hidden" name="id" value={note.id} />
                      <button type="submit" className="text-[#243126] hover:underline">
                        Mark read
                      </button>
                    </form>
                  ) : null}
                </div>
              </DashboardPanel>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="No updates">You are all caught up.</EmptyState>
      )}
    </DashboardShell>
  )
}
