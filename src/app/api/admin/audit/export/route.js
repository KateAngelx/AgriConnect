import { NextResponse } from 'next/server'
import { currentUser } from '@/server/auth'
import { isApprovedAdmin } from '@/server/roles'
import { listAuditEvents } from '@/server/admin'

function csv(value) {
  const text = String(value ?? '')
  return `"${text.replaceAll('"', '""')}"`
}

export async function GET() {
  const user = await currentUser()
  if (!user || !isApprovedAdmin(user)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const events = await listAuditEvents(1000)
  const rows = [['Applicant', 'Type', 'Status', 'Note', 'Updated'], ...events.map((event) => [
    event.applicant, event.type, event.status, event.note, event.at || '',
  ])]
  const body = rows.map((row) => row.map(csv).join(',')).join('\r\n')
  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="agriconnect-audit.csv"',
    },
  })
}
