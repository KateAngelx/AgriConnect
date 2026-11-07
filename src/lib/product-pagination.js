export function visibleProductPageNumbers(page, totalPages) {
  const first = Math.max(1, page - 2)
  const last = Math.min(totalPages, page + 2)
  const pages = []

  if (first > 1) pages.push(1)
  if (first > 2) pages.push('left-ellipsis')
  for (let number = first; number <= last; number += 1) pages.push(number)
  if (last < totalPages - 1) pages.push('right-ellipsis')
  if (last < totalPages) pages.push(totalPages)
  return pages
}
