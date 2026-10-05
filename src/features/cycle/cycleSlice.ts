import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { PHASE_DURATION_MS, PHASES, nextPhase } from './constants'
import type { CycleState, Phase } from './types'

const initialTimestamp = Date.now()

export const initialCycleState: CycleState = {
  version: 1,
  cycleNumber: 1,
  currentPhase: null,
  completed: { sleep: false, work: false, tasks: false },
  timer: null,
  updatedAt: initialTimestamp,
  cycleCompletedAt: null,
  lastNotifiedKey: null,
}

interface PhasePayload {
  phase: Phase
  now: number
}

interface MarkNotifiedPayload {
  key: string
  now: number
}

const resetCompleted = () => ({ sleep: false, work: false, tasks: false })

const cycleSlice = createSlice({
  name: 'cycle',
  initialState: initialCycleState,
  reducers: {
    startPhase(state, action: PayloadAction<PhasePayload>) {
      const { phase, now } = action.payload
      if (state.timer) return

      const selectedIndex = PHASES.indexOf(phase)
      for (const [index, candidate] of PHASES.entries()) {
        state.completed[candidate] = index < selectedIndex
      }

      state.currentPhase = phase
      state.timer = {
        phase,
        startedAt: now,
        endsAt: now + PHASE_DURATION_MS,
      }
      state.updatedAt = now
      state.cycleCompletedAt = null
      state.lastNotifiedKey = null
    },

    advanceCycle(state, action: PayloadAction<{ now: number }>) {
      const now = action.payload.now
      let advanced = false

      while (state.timer && now >= state.timer.endsAt) {
        advanced = true
        const finishedPhase = state.timer.phase
        const transitionAt = state.timer.endsAt

        state.completed[finishedPhase] = true

        if (finishedPhase === 'tasks') {
          state.cycleNumber += 1
          state.completed = resetCompleted()
          state.cycleCompletedAt = transitionAt
        }

        const upcoming = nextPhase(finishedPhase)
        state.currentPhase = upcoming
        state.timer = {
          phase: upcoming,
          startedAt: transitionAt,
          endsAt: transitionAt + PHASE_DURATION_MS,
        }
        state.lastNotifiedKey = null
      }

      if (advanced) state.updatedAt = now
    },

    undoLastCompletion(state, action: PayloadAction<{ now: number }>) {
      const now = action.payload.now
      let phase: Phase | null = null

      if (state.completed.tasks) phase = 'tasks'
      else if (state.completed.work) phase = 'work'
      else if (state.completed.sleep) phase = 'sleep'

      if (!phase) return

      state.completed[phase] = false
      state.currentPhase = null
      state.timer = null
      state.cycleCompletedAt = null
      state.lastNotifiedKey = null
      state.updatedAt = now
    },

    startNewCycle(state, action: PayloadAction<{ now: number }>) {
      const now = action.payload.now
      state.cycleNumber += 1
      state.currentPhase = null
      state.completed = resetCompleted()
      state.timer = null
      state.updatedAt = now
      state.cycleCompletedAt = null
      state.lastNotifiedKey = null
    },

    resetCurrentCycle(state, action: PayloadAction<{ now: number }>) {
      const now = action.payload.now
      state.currentPhase = null
      state.completed = resetCompleted()
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
  startPhase,
  advanceCycle,
  undoLastCompletion,
  startNewCycle,
  resetCurrentCycle,
  markTimerNotified,
  replaceFromSync,
} = cycleSlice.actions

export default cycleSlice.reducer
