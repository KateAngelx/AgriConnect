'use client'

import { useEffect, useState } from 'react'
import { Bell, X } from 'lucide-react'

const STORAGE_KEY = 'agriconnect:last-notification'

export function BrowserNotifications({ enabled }) {
  const [mounted, setMounted] = useState(false)
  const [permission, setPermission] = useState('default')
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (!enabled || !('Notification' in window)) return
    setPermission(Notification.permission)
  }, [enabled])

  useEffect(() => {
    if (!enabled || permission !== 'granted') return
    let stopped = false

    async function poll() {
      if (stopped || document.hidden) return
      try {
        const response = await fetch('/api/notifications/latest', { cache: 'no-store' })
        if (!response.ok) return
        const note = await response.json()
        if (!note.id) return
        const lastId = sessionStorage.getItem(STORAGE_KEY)
        if (lastId === note.id || note.read) return
        sessionStorage.setItem(STORAGE_KEY, note.id)
        const registration = await navigator.serviceWorker?.ready
        if (registration?.showNotification) {
          await registration.showNotification(note.title, {
            body: note.body,
            icon: '/icons/icon-192.png',
            badge: '/icons/icon-192.png',
            data: { url: note.href || '/notifications' },
            tag: note.id,
          })
        } else if (Notification.permission === 'granted') {
          new Notification(note.title, { body: note.body, icon: '/icons/icon-192.png' })
        }
      } catch {
        // Notification delivery must never interrupt the dashboard.
      }
    }

    poll()
    const interval = window.setInterval(poll, 20_000)
    document.addEventListener('visibilitychange', poll)
    return () => {
      stopped = true
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', poll)
    }
  }, [enabled, permission])

  async function enableNotifications() {
    if (!('Notification' in window)) return
    const result = await Notification.requestPermission()
    setPermission(result)
    if (result !== 'granted') return
    try {
      const configResponse = await fetch('/api/push/config', { cache: 'no-store' })
      const { publicKey } = await configResponse.json()
      if (!publicKey) return
      const registration = await navigator.serviceWorker.ready
      const existing = await registration.pushManager.getSubscription()
      if (existing) return
      const key = Uint8Array.from(
        atob(publicKey.replace(/-/g, '+').replace(/_/g, '/')),
        (character) => character.charCodeAt(0),
      )
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: key,
      })
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription.toJSON()),
      })
    } catch {
      // Notification permission still works for foreground polling.
    }
  }

  if (
    !mounted ||
    !enabled ||
    dismissed ||
    typeof window === 'undefined' ||
    !('Notification' in window) ||
    permission === 'granted'
  )
    return null
  if (permission === 'denied') return null

  return (
    <aside
      role="dialog"
      aria-label="Enable notifications"
      className="fixed inset-x-3 top-[calc(.75rem+env(safe-area-inset-top))] z-[110] mx-auto max-w-md rounded-2xl border border-[#d5e4d4] bg-white p-3 shadow-[0_16px_40px_rgba(20,32,22,0.18)] sm:left-auto sm:right-5 sm:mx-0 sm:w-[25rem] sm:p-4"
    >
      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-full bg-[#e9f5e8] text-[#2e7d32]"
          aria-hidden="true"
        >
          <Bell className="size-5" strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-[#142016]">Stay updated</p>
          <p className="mt-0.5 text-sm leading-5 text-[#607064]">
            Get alerts for orders, approvals, and other account activity.
          </p>
          <button
            type="button"
            onClick={enableNotifications}
            className="mt-3 rounded-lg bg-[#2e7d32] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[#256b29] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e7d32] focus-visible:ring-offset-2"
          >
            Enable notifications
          </button>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="grid size-8 shrink-0 place-items-center rounded-full text-[#607064] transition hover:bg-[#edf4ec] hover:text-[#142016] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e7d32]"
          aria-label="Dismiss notification prompt"
        >
          <X className="size-4" />
        </button>
      </div>
    </aside>
  )
}
