import { NextResponse } from 'next/server'
import { currentUser } from '@/server/auth'
import { isApprovedAdmin } from '@/server/roles'
import { platformReport } from '@/server/admin'

function csv(value) {
  const text = String(value ?? '')
  return `"${text.replaceAll('"', '""')}"`
}

export async function GET() {
  const user = await currentUser()
  if (!user || !isApprovedAdmin(user)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const report = await platformReport()
  const rows = [
    ['Metric', 'Value'],
    ...Object.entries(report).map(([metric, value]) => [metric, typeof value === 'number' ? value : String(value ?? '')]),
  ]
  const body = rows.map((row) => row.map(csv).join(',')).join('\r\n')
  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="agriconnect-platform-report.csv"',
    },
  })
}
