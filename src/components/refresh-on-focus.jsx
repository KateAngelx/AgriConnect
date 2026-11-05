'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function RefreshOnFocus() {
  const router = useRouter()

  useEffect(() => {
    let needsRefresh = false
    const refreshIfNeeded = () => {
      if (!needsRefresh || document.visibilityState === 'hidden') return
      needsRefresh = false
      router.refresh()
    }
    const onBlur = () => {
      needsRefresh = true
    }
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') needsRefresh = true
      else refreshIfNeeded()
    }
    window.addEventListener('blur', onBlur)
    window.addEventListener('focus', refreshIfNeeded)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('focus', refreshIfNeeded)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [router])

  return null
}
