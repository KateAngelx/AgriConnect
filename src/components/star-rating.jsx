import { Star } from 'lucide-react'

const STAR_SIZE = {
  sm: 'size-3.5',
  md: 'size-5',
  lg: 'size-6',
}

export function StarRating({
  rating = 0,
  reviewCount,
  size = 'sm',
  showValue = false,
  className = '',
}) {
  const numericRating = Math.max(0, Math.min(5, Number(rating) || 0))
  const countLabel =
    Number.isFinite(Number(reviewCount))
      ? `${Number(reviewCount)} ${Number(reviewCount) === 1 ? 'review' : 'reviews'}`
      : ''
  const iconClass = STAR_SIZE[size] || STAR_SIZE.sm

  return (
    <span
      className={`inline-flex items-center gap-1.5 ${className}`}
      aria-label={`${numericRating.toFixed(1)} out of 5 stars${countLabel ? ` from ${countLabel}` : ''}`}
    >
      <span className="inline-flex shrink-0 items-center gap-0.5" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((index) => {
          const fill = Math.max(0, Math.min(1, numericRating - index))
          return (
            <span key={index} className={`relative inline-block ${iconClass}`}>
              <Star className={`${iconClass} text-[#c8b89a]`} fill="none" strokeWidth={1.8} />
              {fill > 0 ? (
                <span
                  className="absolute inset-y-0 left-0 overflow-hidden"
                  style={{ width: `${fill * 100}%` }}
                >
                  <Star className={`${iconClass} text-[#d28b00]`} fill="currentColor" strokeWidth={1.8} />
                </span>
              ) : null}
            </span>
          )
        })}
      </span>
      {showValue ? (
        <span className="tabular-nums">
          {numericRating.toFixed(1)}
          {countLabel ? ` (${countLabel})` : ''}
        </span>
      ) : null}
    </span>
  )
}
