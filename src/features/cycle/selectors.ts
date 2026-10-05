import type { RootState } from '../../store'
import type { Phase, PhaseStatus } from './types'

export const selectCycle = (state: RootState) => state.cycle

export const getPhaseStatus = (
  state: RootState['cycle'],
  phase: Phase,
  now: number,
): PhaseStatus => {
  if (state.completed[phase]) return 'done'
  if (state.currentPhase !== phase) return 'locked'
  if (!state.timer) return 'ready'
  if (state.timer.phase !== phase) return 'locked'
  return now >= state.timer.endsAt ? 'ready' : 'running'
}

export const getRemainingMs = (
  state: RootState['cycle'],
  phase: Phase,
  now: number,
): number | null => {
  if (!state.timer || state.timer.phase !== phase) return null
  return Math.max(0, state.timer.endsAt - now)
}
