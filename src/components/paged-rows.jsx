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
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <Tag className={`min-h-0 flex-1 overflow-y-auto ${className}`}>{visible}</Tag>
      <div className={`mt-auto flex h-12 shrink-0 items-center justify-end gap-2 px-4 ${canPage ? 'border-t border-[#d5e4d4]' : 'invisible'}`}>
        <button
          type="button"
          aria-label="Previous"
          disabled={!canPage || current === 0}
          onClick={() => setPage(current - 1)}
          className="grid size-8 place-items-center rounded-lg border border-[#d5e4d4] text-sm font-bold text-[#142016] hover:bg-[#e7f3e4] disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent"
        >
          &lt;
        </button>
        <button
          type="button"
          aria-label="Next"
          disabled={!canPage || current >= pageCount - 1}
          onClick={() => setPage(current + 1)}
          className="grid size-8 place-items-center rounded-lg border border-[#d5e4d4] text-sm font-bold text-[#142016] hover:bg-[#e7f3e4] disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent"
        >
          &gt;
        </button>
      </div>
    </div>
  )
}
