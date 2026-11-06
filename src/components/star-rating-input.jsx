'use client'

import { useState } from 'react'
import { Star } from 'lucide-react'

export function StarRatingInput({ name = 'rating', defaultValue = 5 }) {
  const initial = Math.max(1, Math.min(5, Number(defaultValue) || 5))
  const [value, setValue] = useState(initial)

  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating">
      <input type="hidden" name={name} value={value} />
      {[1, 2, 3, 4, 5].map((rating) => (
        <button
          key={rating}
          type="button"
          role="radio"
          aria-checked={value === rating}
          aria-label={`${rating} ${rating === 1 ? 'star' : 'stars'}`}
          onClick={() => setValue(rating)}
          className="grid size-10 place-items-center rounded-lg text-[#d28b00] transition-colors hover:bg-[#fff7df] focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <Star
            className="size-7"
            fill={rating <= value ? 'currentColor' : 'none'}
            strokeWidth={1.8}
          />
        </button>
      ))}
      <span className="ml-2 text-sm font-medium text-brand-muted">{value} / 5</span>
    </div>
  )
}
