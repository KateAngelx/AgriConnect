'use client'

import { useEffect, useRef, useState } from 'react'

const DISMISS_KEY = 'agriconnect-install-dismissed'

function isInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
}

function isPhoneBrowser() {
  const narrow = window.matchMedia('(max-width: 900px)').matches
  const touch = window.matchMedia('(pointer: coarse)').matches
  const ua = navigator.userAgent || ''
  const phoneUa = /Android|iPhone|iPod|Mobile/i.test(ua)
  return (narrow && touch) || phoneUa
}

function isIos() {
  const ua = navigator.userAgent || ''
  return /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

export function InstallAppToast() {
  const promptRef = useRef(null)
  const [mode, setMode] = useState(null)

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
    if (isInstalled() || !isPhoneBrowser()) return
    if (localStorage.getItem(DISMISS_KEY) === '1') return

    const onPrompt = (event) => {
      event.preventDefault()
      promptRef.current = event
      setMode('native')
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    const timer = window.setTimeout(() => {
      setMode((current) => current || 'manual')
    }, 1200)

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.clearTimeout(timer)
    }
  }, [])

  if (!mode) return null

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1')
    setMode(null)
  }

  const install = async () => {
    const prompt = promptRef.current
    if (!prompt) return
    await prompt.prompt()
    const choice = await prompt.userChoice
    promptRef.current = null
    if (choice?.outcome === 'accepted') setMode(null)
    else dismiss()
  }

  const ios = isIos()
  const manual = mode === 'manual'

  return (
    <div
      role="status"
      className="fixed inset-x-3 z-[120] rounded-2xl border border-[#d5e4d4] bg-white p-4 shadow-xl bottom-[calc(5.5rem+env(safe-area-inset-bottom))] sm:left-auto sm:right-4 sm:max-w-sm"
    >
      <p className="text-sm font-bold text-[#142016]">Install AgriConnect</p>
      <p className="mt-1 text-[13px] leading-5 text-[#5c6f62]">
        {manual
          ? ios
            ? 'Tap Share, then Add to Home Screen. The app then opens from your phone like a downloaded app.'
            : 'Open the browser menu and choose Install app or Add to Home screen.'
          : 'Add AgriConnect to this phone so you can open it from the home screen.'}
      </p>
      <div className="mt-3 flex gap-2">
        {manual ? (
          <button type="button" className="btn btn-primary" onClick={dismiss}>Got it</button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={install}>Install</button>
        )}
        <button type="button" className="btn btn-secondary" onClick={dismiss}>Not now</button>
      </div>
    </div>
  )
}
