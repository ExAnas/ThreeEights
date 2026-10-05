import { isTauriDesktop } from './native'

export async function requestNotifications(): Promise<NotificationPermission | 'unsupported'> {
  if (isTauriDesktop()) {
    const { isPermissionGranted, requestPermission } = await import('@tauri-apps/plugin-notification')
    if (await isPermissionGranted()) return 'granted'
    const permission = await requestPermission()
    return permission === 'granted' ? 'granted' : 'denied'
  }

  if (!('Notification' in window)) return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'
  return Notification.requestPermission()
}

export async function getNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (isTauriDesktop()) {
    const { isPermissionGranted } = await import('@tauri-apps/plugin-notification')
    return (await isPermissionGranted()) ? 'granted' : 'default'
  }
  return 'Notification' in window ? Notification.permission : 'unsupported'
}

export async function showPhaseReadyNotification(title: string, nextTitle: string): Promise<void> {
  // The Windows desktop build schedules this natively in Rust so it still fires
  // while the window is hidden in the system tray. Avoid a duplicate toast here.
  if (isTauriDesktop()) return
  if (!('Notification' in window) || Notification.permission !== 'granted') return

  const body = `انتهت فترة ${title} وبدأت فترة ${nextTitle} تلقائياً.`
  const registration = await navigator.serviceWorker?.ready.catch(() => null)
  if (registration) {
    const options: NotificationOptions & { renotify?: boolean } = {
      body,
      icon: '/icon.svg',
      badge: '/icon.svg',
      tag: 'phase-ready',
      renotify: true,
    }
    await registration.showNotification('8 × 3', options)
    return
  }

  new Notification('8 × 3', { body })
}

export function playReadyTone(): void {
  try {
    const AudioContextCtor = window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextCtor) return
    const ctx = new AudioContextCtor()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.value = 660
    gain.gain.setValueAtTime(0.0001, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.36)
    osc.addEventListener('ended', () => void ctx.close())
  } catch {
    // Progressive enhancement only.
  }
}
