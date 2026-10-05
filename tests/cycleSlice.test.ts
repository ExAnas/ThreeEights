import { describe, expect, it } from 'vitest'
import reducer, {
  advanceCycle,
  initialCycleState,
  resetCurrentCycle,
  startPhase,
} from '../src/features/cycle/cycleSlice'
import { PHASE_DURATION_MS } from '../src/features/cycle/constants'

function fresh() {
  return {
    ...initialCycleState,
    completed: { ...initialCycleState.completed },
    currentPhase: null,
    timer: null,
    updatedAt: 0,
  }
}

describe('cycle reducer', () => {
  it('starts idle so any phase can be selected', () => {
    const state = fresh()
    expect(state.currentPhase).toBeNull()
    expect(state.timer).toBeNull()
    expect(state.completed).toEqual({ sleep: false, work: false, tasks: false })
  })

  it('can start directly from work and counts sleep as completed', () => {
    const now = 1_000
    const state = reducer(fresh(), startPhase({ phase: 'work', now }))

    expect(state.completed).toEqual({ sleep: true, work: false, tasks: false })
    expect(state.currentPhase).toBe('work')
    expect(state.timer).toEqual({ phase: 'work', startedAt: now, endsAt: now + PHASE_DURATION_MS })
  })

  it('can start directly from tasks and counts earlier phases as completed', () => {
    const now = 2_000
    const state = reducer(fresh(), startPhase({ phase: 'tasks', now }))

    expect(state.completed).toEqual({ sleep: true, work: true, tasks: false })
    expect(state.currentPhase).toBe('tasks')
    expect(state.timer?.phase).toBe('tasks')
  })

  it('does not let another phase replace a running timer', () => {
    const t0 = 1_000
    const running = reducer(fresh(), startPhase({ phase: 'sleep', now: t0 }))
    const unchanged = reducer(running, startPhase({ phase: 'tasks', now: t0 + 1_000 }))

    expect(unchanged.currentPhase).toBe('sleep')
    expect(unchanged.timer?.phase).toBe('sleep')
  })

  it('moves automatically to the next phase at the deadline', () => {
    const t0 = 1_000
    let state = reducer(fresh(), startPhase({ phase: 'sleep', now: t0 }))
    state = reducer(state, advanceCycle({ now: t0 + PHASE_DURATION_MS }))

    expect(state.completed.sleep).toBe(true)
    expect(state.currentPhase).toBe('work')
    expect(state.timer).toEqual({
      phase: 'work',
      startedAt: t0 + PHASE_DURATION_MS,
      endsAt: t0 + PHASE_DURATION_MS * 2,
    })
  })

  it('wraps after tasks into a new cycle and starts sleep automatically', () => {
    const t0 = 1_000
    let state = reducer(fresh(), startPhase({ phase: 'tasks', now: t0 }))
    state = reducer(state, advanceCycle({ now: t0 + PHASE_DURATION_MS }))

    expect(state.cycleNumber).toBe(2)
    expect(state.completed).toEqual({ sleep: false, work: false, tasks: false })
    expect(state.currentPhase).toBe('sleep')
    expect(state.timer).toEqual({
      phase: 'sleep',
      startedAt: t0 + PHASE_DURATION_MS,
      endsAt: t0 + PHASE_DURATION_MS * 2,
    })
  })

  it('catches up across multiple elapsed phases without losing the schedule', () => {
    const t0 = 1_000
    let state = reducer(fresh(), startPhase({ phase: 'sleep', now: t0 }))
    state = reducer(state, advanceCycle({ now: t0 + PHASE_DURATION_MS * 3 }))

    expect(state.cycleNumber).toBe(2)
    expect(state.completed).toEqual({ sleep: false, work: false, tasks: false })
    expect(state.currentPhase).toBe('sleep')
    expect(state.timer?.startedAt).toBe(t0 + PHASE_DURATION_MS * 3)
    expect(state.timer?.endsAt).toBe(t0 + PHASE_DURATION_MS * 4)
  })

  it('reset stops the timer and lets the user choose again', () => {
    const t0 = 1_000
    let state = reducer(fresh(), startPhase({ phase: 'work', now: t0 }))
    state = reducer(state, resetCurrentCycle({ now: t0 + 5_000 }))

    expect(state.currentPhase).toBeNull()
    expect(state.timer).toBeNull()
    expect(state.completed).toEqual({ sleep: false, work: false, tasks: false })
  })
})
