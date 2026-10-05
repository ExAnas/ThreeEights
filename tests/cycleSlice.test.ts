import { describe, expect, it } from 'vitest'
import reducer, {
  completePhase,
  initialCycleState,
  startNewCycle,
  undoLastCompletion,
} from '../src/features/cycle/cycleSlice'
import { PHASE_DURATION_MS } from '../src/features/cycle/constants'

function fresh() {
  return {
    ...initialCycleState,
    completed: { ...initialCycleState.completed },
    updatedAt: 0,
  }
}

describe('cycle reducer', () => {
  it('starts with sleep ready and no timer', () => {
    const state = fresh()
    expect(state.currentPhase).toBe('sleep')
    expect(state.timer).toBeNull()
  })

  it('completing sleep starts the work timer', () => {
    const now = 1_000
    const state = reducer(fresh(), completePhase({ phase: 'sleep', now }))
    expect(state.completed.sleep).toBe(true)
    expect(state.currentPhase).toBe('work')
    expect(state.timer).toEqual({ phase: 'work', startedAt: now, endsAt: now + PHASE_DURATION_MS })
  })

  it('does not allow completing a running phase early', () => {
    const t0 = 1_000
    const afterSleep = reducer(fresh(), completePhase({ phase: 'sleep', now: t0 }))
    const early = reducer(afterSleep, completePhase({ phase: 'work', now: t0 + 1000 }))
    expect(early.completed.work).toBe(false)
    expect(early.currentPhase).toBe('work')
  })

  it('allows completing a phase at its deadline', () => {
    const t0 = 1_000
    const afterSleep = reducer(fresh(), completePhase({ phase: 'sleep', now: t0 }))
    const workDone = reducer(afterSleep, completePhase({ phase: 'work', now: t0 + PHASE_DURATION_MS }))
    expect(workDone.completed.work).toBe(true)
    expect(workDone.currentPhase).toBe('tasks')
    expect(workDone.timer?.phase).toBe('tasks')
  })

  it('undoes only the most recent completion and cancels the downstream timer', () => {
    const t0 = 1_000
    let state = reducer(fresh(), completePhase({ phase: 'sleep', now: t0 }))
    state = reducer(state, completePhase({ phase: 'work', now: t0 + PHASE_DURATION_MS }))
    state = reducer(state, undoLastCompletion({ now: t0 + PHASE_DURATION_MS + 500 }))
    expect(state.completed.sleep).toBe(true)
    expect(state.completed.work).toBe(false)
    expect(state.currentPhase).toBe('work')
    expect(state.timer).toBeNull()
  })

  it('finishes the cycle after tasks and can start a new cycle', () => {
    const t0 = 1_000
    let state = reducer(fresh(), completePhase({ phase: 'sleep', now: t0 }))
    state = reducer(state, completePhase({ phase: 'work', now: t0 + PHASE_DURATION_MS }))
    state = reducer(state, completePhase({ phase: 'tasks', now: t0 + PHASE_DURATION_MS * 2 }))
    expect(state.currentPhase).toBeNull()
    expect(state.completed.tasks).toBe(true)

    state = reducer(state, startNewCycle({ now: t0 + PHASE_DURATION_MS * 2 + 1 }))
    expect(state.cycleNumber).toBe(2)
    expect(state.currentPhase).toBe('sleep')
    expect(state.completed).toEqual({ sleep: false, work: false, tasks: false })
  })
})
