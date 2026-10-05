import type { CycleState } from '../features/cycle/types'

export const STORAGE_KEY = 'three-eights:cycle:v1'
export const THEME_KEY = 'three-eights:theme'
export const SOUND_KEY = 'three-eights:sound'

export function loadCycleState(): CycleState | undefined {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return undefined
    const parsed = JSON.parse(raw) as CycleState
    if (parsed?.version !== 1) return undefined
    return parsed
  } catch {
    return undefined
  }
}

export function saveCycleState(state: CycleState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Storage can be unavailable in privacy modes. The app still works in memory.
  }
}
