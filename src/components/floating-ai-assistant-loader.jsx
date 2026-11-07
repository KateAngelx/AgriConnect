'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'

const FloatingAiAssistant = dynamic(
  () => import('@/components/floating-ai-assistant').then((module) => module.FloatingAiAssistant),
  {
    loading: () => (
      <div
        role="status"
        className="pointer-events-none fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-[max(1.25rem,env(safe-area-inset-right))] z-[100] rounded-full bg-white px-4 py-3 text-sm font-medium text-[#142016] shadow-lg"
      >
        Loading assistant…
      </div>
    ),
  },
)

export function FloatingAiAssistantLoader({ user }) {
  const [loaded, setLoaded] = useState(false)

  if (loaded) return <FloatingAiAssistant user={user} initialOpen />

  return (
    <button
      type="button"
      onClick={() => setLoaded(true)}
      className="pointer-events-auto fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-[max(1.25rem,env(safe-area-inset-right))] z-[100] grid size-14 place-items-center rounded-full bg-[#2e7d32] text-white shadow-lg hover:bg-[#1b5e20]"
      aria-label="Open AI assistant"
    >
      <svg
        viewBox="0 0 24 24"
        className="size-6 fill-none stroke-current stroke-2"
        aria-hidden="true"
      >
        <path d="M7 18 4 21V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H7Z" />
      </svg>
    </button>
  )
}
