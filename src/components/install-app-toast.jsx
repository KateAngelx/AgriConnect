'use client'

import { useEffect, useState } from 'react'
import { installApp, isAndroid, isInstallablePhone, isIos } from '@/lib/install-app'

const DISMISS_KEY = 'agriconnect-install-dismissed:v2'

export function InstallAppMenuButton({ onDone }) {
  const [kind, setKind] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => {
    if (!isInstallablePhone()) return
    setKind(isIos() ? 'ios' : 'android')
  }, [])

  if (!kind) return null

  return (
    <div className="mt-2 border-t border-[#d5e4d4] pt-2">
      <button
        type="button"
        className="flex min-h-11 w-full items-center rounded-lg px-3 text-left text-[15px] font-medium text-[#142016]"
        onClick={async () => {
          const result = await installApp()
          setNote(result.message)
          if (result.ok && kind !== 'ios') onDone?.()
        }}
      >
        {kind === 'ios' ? 'Add to Home Screen' : 'Install app'}
      </button>
      {note ? <p className="px-3 pb-2 text-xs leading-5 text-[#5c6f62]">{note}</p> : null}
    </div>
  )
}

export function InstallAppToast() {
  const [ready, setReady] = useState(false)
  const [hasPrompt, setHasPrompt] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {})
    }
    if (!isInstallablePhone() || localStorage.getItem(DISMISS_KEY) === '1') return

    const syncPrompt = () => {
      if (window.__agriconnectInstall) setHasPrompt(true)
    }
    const onPrompt = (event) => {
      event.preventDefault()
      window.__agriconnectInstall = event
      setHasPrompt(true)
    }
    const showDelay = window.setTimeout(() => {
      syncPrompt()
      setReady(true)
    }, 1200)
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => {
      window.clearTimeout(showDelay)
      window.removeEventListener('beforeinstallprompt', onPrompt)
    }
  }, [])

  if (!ready) return null

  const ios = isIos()
  const insecureAndroid = isAndroid() && !window.isSecureContext

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1')
    setReady(false)
  }

  const install = async () => {
    const result = await installApp()
    if (result.ok && !ios) {
      setReady(false)
      return
    }
    if (result.message) setMessage(result.message)
  }

  const title = ios ? 'Add AgriConnect to your iPhone' : 'Install AgriConnect'
  const body = insecureAndroid
    ? 'Android can install the app only from a secure https address. A plain http link on Wi-Fi will not show the install dialog.'
    : ios
      ? 'Tap Share, then choose Add to Home Screen. For only a quick saved link, tap Share and choose Add Bookmark.'
      : hasPrompt
        ? 'Add AgriConnect to this phone and open it from the home screen.'
        : 'If the install dialog does not open, use the browser menu and choose Install app.'

  return (
    <div
      role="status"
      className="fixed inset-x-3 z-[120] rounded-2xl border border-[#d5e4d4] bg-white p-4 shadow-xl bottom-[calc(5.5rem+env(safe-area-inset-bottom))] sm:left-auto sm:right-4 sm:max-w-sm"
    >
      <p className="text-sm font-bold text-[#142016]">{title}</p>
      <p className="mt-1 text-[13px] leading-5 text-[#5c6f62]">{message || body}</p>
      <div className="mt-3 flex gap-2">
        {insecureAndroid ? (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setMessage('Open Chrome on an HTTPS address, such as your deployed site. Then use Chrome menu and choose Add to Home screen.')}
          >
            How to install
          </button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={install}>
            {ios ? 'Install or bookmark' : hasPrompt ? 'Install' : 'Install app'}
          </button>
        )}
        <button type="button" className="btn btn-secondary" onClick={dismiss}>Not now</button>
      </div>
    </div>
  )
}
