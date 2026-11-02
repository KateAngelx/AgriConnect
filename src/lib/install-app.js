export function isInstalled() {
  if (typeof window === 'undefined') return false
  const standalone = window.matchMedia('(display-mode: standalone)').matches
  const fullscreen = window.matchMedia('(display-mode: fullscreen)').matches
  return standalone || fullscreen || window.navigator.standalone === true
}

export function isIos() {
  const ua = navigator.userAgent || ''
  const iPadOs = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
  return /iPhone|iPad|iPod/i.test(ua) || iPadOs
}

function isIosInAppBrowser() {
  const ua = navigator.userAgent || ''
  return isIos() && /CriOS|FxiOS|EdgiOS|OPiOS|FBAN|FBAV|Instagram|GSA\//i.test(ua)
}

export function isAndroid() {
  return /Android/i.test(navigator.userAgent || '')
}

export function isInstallablePhone() {
  if (isInstalled()) return false
  if (isIos() || isAndroid()) return true
  return window.matchMedia('(max-width: 900px)').matches && window.matchMedia('(pointer: coarse)').matches
}

export async function installApp() {
  const prompt = window.__agriconnectInstall
  if (prompt) {
    try {
      await prompt.prompt()
      const choice = await prompt.userChoice
      window.__agriconnectInstall = null
      if (choice?.outcome === 'accepted') {
        return { ok: true, message: 'AgriConnect was added to this phone.' }
      }
      return { ok: false, message: 'Install was not added. Open the browser menu and choose Install app.' }
    } catch {
      window.__agriconnectInstall = null
    }
  }

  if (isIos()) {
    if (isIosInAppBrowser() || typeof navigator.share !== 'function') {
      return {
        ok: false,
        message: 'Open this page in Safari, tap Share, then Add to Home Screen. Add Bookmark is in that same menu.',
      }
    }
    try {
      await navigator.share({
        title: 'AgriConnect',
        url: `${window.location.origin}/`,
      })
      return {
        ok: true,
        message: 'In the share sheet, tap Add to Home Screen. Add Bookmark is in that same sheet.',
      }
    } catch (error) {
      if (error?.name === 'AbortError') return { ok: false, message: '' }
      return { ok: false, message: 'Tap the Share button in Safari, then Add to Home Screen.' }
    }
  }

  if (isAndroid() && !window.isSecureContext) {
    return {
      ok: false,
      message: 'Android can install the app only from a secure https address. A plain http link on Wi-Fi will not show Install.',
    }
  }

  return {
    ok: false,
    message: 'Open the browser menu and choose Install app or Add to Home screen.',
  }
}
