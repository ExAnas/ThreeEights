import type { RootState } from '../../store'
import type { Phase, PhaseStatus } from './types'

export const selectCycle = (state: RootState) => state.cycle

export const getPhaseStatus = (
  state: RootState['cycle'],
  phase: Phase,
  _now: number,
): PhaseStatus => {
  if (state.completed[phase]) return 'done'
  if (!state.timer) return 'ready'
  if (state.timer.phase === phase) return 'running'
  return 'locked'
}

export const getRemainingMs = (
  state: RootState['cycle'],
  phase: Phase,
  now: number,
): number | null => {
  if (!state.timer || state.timer.phase !== phase) return null
  return Math.max(0, state.timer.endsAt - now)
}
