import Link from 'next/link'
import { PERIODS } from '@/lib/report-period'

export function PeriodFilter({ period = 'all', pathname, extra = {} }) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Record period">
      {PERIODS.map(([id, label]) => {
        const params = new URLSearchParams()
        for (const [key, value] of Object.entries(extra)) {
          if (value) params.set(key, String(value))
        }
        if (id !== 'all') params.set('period', id)
        const query = params.toString()
        const href = query ? `${pathname}?${query}` : pathname
        const selected = period === id
        return (
          <Link
            key={id}
            href={href}
            aria-current={selected ? 'true' : undefined}
            className={`rounded-lg px-3 py-1.5 text-[13px] font-medium ${
              selected ? 'bg-[#e3f3d8] text-[#1b5e20]' : 'bg-white text-[#142016] ring-1 ring-[#d5e4d4] hover:bg-[#e3f3d8]'
            }`}
          >
            {label}
          </Link>
        )
      })}
    </div>
  )
}
