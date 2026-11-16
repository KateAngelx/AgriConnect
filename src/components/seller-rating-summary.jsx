import { StarRating } from '@/components/star-rating'

/** Overall star rating for a seller across all of their products, with a 5★→1★ breakdown. */
export function SellerRatingSummary({ summary, className = '' }) {
  if (!summary?.reviewCount) {
    return (
      <div className={`rounded-xl border border-[#d5e4d4] bg-white p-4 text-sm text-[#5c6f62] ${className}`}>
        No product reviews yet. Ratings appear here after buyers review this farm&apos;s products.
      </div>
    )
  }
  const { rating, reviewCount, ratedProducts, breakdown } = summary
  return (
    <div className={`grid gap-4 rounded-xl border border-[#d5e4d4] bg-white p-4 sm:grid-cols-[auto_1fr] sm:items-center sm:gap-6 ${className}`}>
      <div className="text-center sm:min-w-36">
        <p className="text-4xl font-bold leading-none text-[#142016]">{rating.toFixed(1)}</p>
        <StarRating rating={rating} size="md" className="mt-2 justify-center" />
        <p className="mt-1 text-[13px] text-[#5c6f62]">
          {reviewCount} review{reviewCount === 1 ? '' : 's'} · {ratedProducts} product{ratedProducts === 1 ? '' : 's'}
        </p>
      </div>
      <div className="space-y-1.5">
        {[5, 4, 3, 2, 1].map((stars) => {
          const count = breakdown?.[stars] || 0
          const width = reviewCount ? Math.round((count / reviewCount) * 100) : 0
          return (
            <div key={stars} className="flex items-center gap-2 text-[13px] text-[#344a3b]">
              <span className="w-6 shrink-0 text-right">{stars}★</span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-[#e7efe5]">
                <span className="block h-full rounded-full bg-[#f2b01e]" style={{ width: `${width}%` }} />
              </span>
              <span className="w-6 shrink-0 text-[#5c6f62]">{count}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
