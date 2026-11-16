'use client'

import { createContext, useContext, useEffect, useState } from 'react'

const HeadingContext = createContext(null)

export function HeadingProvider({ children }) {
  const [heading, setHeading] = useState(null)
  return <HeadingContext.Provider value={{ heading, setHeading }}>{children}</HeadingContext.Provider>
}

export function useAnnouncedHeading() {
  return useContext(HeadingContext)?.heading || null
}

export function PageHeading({ title, subtitle = '', variant = 'default' }) {
  const setHeading = useContext(HeadingContext)?.setHeading
  useEffect(() => {
    setHeading?.({ title, subtitle, variant })
    // Clear on leave, or the next page (if it sets no heading) keeps this page's title.
    return () => setHeading?.(null)
  }, [setHeading, title, subtitle, variant])
  return null
}
