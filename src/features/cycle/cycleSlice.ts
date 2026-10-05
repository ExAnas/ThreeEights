import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { PHASE_DURATION_MS, nextPhase } from './constants'
import type { CycleState, Phase } from './types'

const initialTimestamp = Date.now()

export const initialCycleState: CycleState = {
  version: 1,
  cycleNumber: 1,
  currentPhase: 'sleep',
  completed: { sleep: false, work: false, tasks: false },
  timer: null,
  updatedAt: initialTimestamp,
  cycleCompletedAt: null,
  lastNotifiedKey: null,
}

interface CompletePayload {
  phase: Phase
  now: number
}

interface MarkNotifiedPayload {
  key: string
  now: number
}

const cycleSlice = createSlice({
  name: 'cycle',
  initialState: initialCycleState,
  reducers: {
    completePhase(state, action: PayloadAction<CompletePayload>) {
      const { phase, now } = action.payload
      if (state.currentPhase !== phase) return
      if (state.completed[phase]) return
      if (state.timer && state.timer.phase === phase && now < state.timer.endsAt) return

      state.completed[phase] = true
      const upcoming = nextPhase(phase)
      state.updatedAt = now
      state.lastNotifiedKey = null

      if (upcoming) {
        state.currentPhase = upcoming
        state.timer = {
          phase: upcoming,
          startedAt: now,
          endsAt: now + PHASE_DURATION_MS,
        }
      } else {
        state.currentPhase = null
        state.timer = null
        state.cycleCompletedAt = now
      }
    },
    undoLastCompletion(state, action: PayloadAction<{ now: number }>) {
      const now = action.payload.now
      let phase: Phase | null = null

      if (state.completed.tasks) phase = 'tasks'
      else if (state.completed.work) phase = 'work'
      else if (state.completed.sleep) phase = 'sleep'

      if (!phase) return

      state.completed[phase] = false
      state.currentPhase = phase
      state.timer = null
      state.cycleCompletedAt = null
      state.lastNotifiedKey = null
      state.updatedAt = now
    },
    startNewCycle(state, action: PayloadAction<{ now: number }>) {
      const now = action.payload.now
      state.cycleNumber += 1
      state.currentPhase = 'sleep'
      state.completed = { sleep: false, work: false, tasks: false }
      state.timer = null
      state.updatedAt = now
      state.cycleCompletedAt = null
      state.lastNotifiedKey = null
    },
    resetCurrentCycle(state, action: PayloadAction<{ now: number }>) {
      const now = action.payload.now
      state.currentPhase = 'sleep'
      state.completed = { sleep: false, work: false, tasks: false }
      state.timer = null
      state.updatedAt = now
      state.cycleCompletedAt = null
      state.lastNotifiedKey = null
    },
    markTimerNotified(state, action: PayloadAction<MarkNotifiedPayload>) {
      state.lastNotifiedKey = action.payload.key
      state.updatedAt = action.payload.now
    },
    replaceFromSync(_state, action: PayloadAction<CycleState>) {
      return action.payload
    },
  },
})

export const {
  completePhase,
  undoLastCompletion,
  startNewCycle,
  resetCurrentCycle,
  markTimerNotified,
  replaceFromSync,
} = cycleSlice.actions

export default cycleSlice.reducer
