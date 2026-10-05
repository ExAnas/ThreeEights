import { configureStore } from '@reduxjs/toolkit'
import cycleReducer from './features/cycle/cycleSlice'
import { loadCycleState, saveCycleState } from './lib/persistence'

const persistedCycle = typeof window !== 'undefined' ? loadCycleState() : undefined

export const store = configureStore({
  reducer: { cycle: cycleReducer },
  preloadedState: persistedCycle ? { cycle: persistedCycle } : undefined,
})

store.subscribe(() => saveCycleState(store.getState().cycle))

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
