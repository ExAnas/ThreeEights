export type Phase = 'sleep' | 'work' | 'tasks'

export type CompletedMap = Record<Phase, boolean>

export interface TimerState {
  phase: Phase
  startedAt: number
  endsAt: number
}

export interface CycleState {
  version: 1
  cycleNumber: number
  currentPhase: Phase | null
  completed: CompletedMap
  timer: TimerState | null
  updatedAt: number
  cycleCompletedAt: number | null
  lastNotifiedKey: string | null
}

export type PhaseStatus = 'done' | 'running' | 'ready' | 'locked'
