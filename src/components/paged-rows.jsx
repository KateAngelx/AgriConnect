'use client'

import { Children, useState } from 'react'

const pageSize = 5

export function PagedRows({ children, className = 'divide-y divide-[#d5e4d4]', asList = true }) {
  const items = Children.toArray(children)
  const [page, setPage] = useState(0)
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize))
  const current = Math.min(page, pageCount - 1)
  const visible = items.slice(current * pageSize, current * pageSize + pageSize)
  const Tag = asList ? 'ul' : 'div'

  const canPage = items.length > pageSize

  return (
    <div className="flex min-h-0 flex-col overflow-hidden max-sm:h-auto max-sm:overflow-visible">
      <Tag className={className}>{visible}</Tag>
      <div className="mt-auto flex min-h-12 shrink-0 items-center justify-end gap-2 border-t border-[#d5e4d4] px-4 py-1">
          <button
            type="button"
            aria-label="Previous"
            disabled={!canPage || current === 0}
            onClick={() => setPage((value) => Math.max(0, value - 1))}
            className="grid size-10 touch-manipulation place-items-center rounded-lg border border-[#b8d2af] bg-[#f2f8ef] text-sm font-bold text-[#2e7d32] shadow-sm hover:bg-[#e7f3e4] disabled:cursor-default disabled:border-[#e0e5df] disabled:bg-[#f5f6f4] disabled:text-[#aeb5ae] disabled:shadow-none disabled:hover:bg-[#f5f6f4] max-sm:size-11"
          >
            &lt;
          </button>
          <button
            type="button"
            aria-label="Next"
            disabled={!canPage || current >= pageCount - 1}
            onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))}
            className="grid size-10 touch-manipulation place-items-center rounded-lg border border-[#b8d2af] bg-[#f2f8ef] text-sm font-bold text-[#2e7d32] shadow-sm hover:bg-[#e7f3e4] disabled:cursor-default disabled:border-[#e0e5df] disabled:bg-[#f5f6f4] disabled:text-[#aeb5ae] disabled:shadow-none disabled:hover:bg-[#f5f6f4] max-sm:size-11"
          >
            &gt;
          </button>
      </div>
    </div>
  )
}
