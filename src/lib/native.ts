import type { Phase } from '../features/cycle/types'

export function isTauriDesktop(): boolean {
  return '__TAURI_INTERNALS__' in window
}

export async function scheduleNativePhaseNotification(
  phase: Phase,
  phaseTitle: string,
  nextPhaseTitle: string,
  endsAt: number,
): Promise<void> {
  if (!isTauriDesktop()) return
  const { invoke } = await import('@tauri-apps/api/core')
  await invoke('schedule_phase_notification', {
    request: { phase, phaseTitle, nextPhaseTitle, endsAt },
  })
}

export async function cancelNativePhaseNotification(): Promise<void> {
  if (!isTauriDesktop()) return
  const { invoke } = await import('@tauri-apps/api/core')
  await invoke('cancel_phase_notification')
}

export async function updateNativeTrayCountdown(phaseTitle: string, remainingMs: number): Promise<void> {
  if (!isTauriDesktop()) return
  const { invoke } = await import('@tauri-apps/api/core')
  await invoke('update_tray_countdown', {
    request: {
      phaseTitle,
      remainingMs: Math.max(0, Math.floor(remainingMs)),
    },
  })
}

export async function resetNativeTrayCountdown(): Promise<void> {
  if (!isTauriDesktop()) return
  const { invoke } = await import('@tauri-apps/api/core')
  await invoke('reset_tray_countdown')
}
