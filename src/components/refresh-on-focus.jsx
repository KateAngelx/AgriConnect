'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function RefreshOnFocus() {
  const router = useRouter()

  useEffect(() => {
    let hiddenAt = 0
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now()
        return
      }
      if (hiddenAt && Date.now() - hiddenAt >= 60_000) {
        router.refresh()
      }
      hiddenAt = 0
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [router])

  return null
}
