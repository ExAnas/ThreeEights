import type { Phase } from './types'

export const EIGHT_HOURS_MS = 8 * 60 * 60 * 1000

const envDuration = Number(import.meta.env.VITE_PHASE_DURATION_MS)
export const PHASE_DURATION_MS =
  Number.isFinite(envDuration) && envDuration > 0 ? envDuration : EIGHT_HOURS_MS

export const PHASES: Phase[] = ['sleep', 'work', 'tasks']

export const PHASE_META: Record<
  Phase,
  { title: string; short: string; description: string; icon: 'moon' | 'briefcase' | 'checklist' }
> = {
  sleep: {
    title: 'النوم',
    short: '01',
    description: 'ثماني ساعات للاستعادة والهدوء.',
    icon: 'moon',
  },
  work: {
    title: 'العمل',
    short: '02',
    description: 'ثماني ساعات للتركيز والإنجاز المهني.',
    icon: 'briefcase',
  },
  tasks: {
    title: 'المهام',
    short: '03',
    description: 'ثماني ساعات للحياة، الالتزامات، وما يهمك.',
    icon: 'checklist',
  },
}

export const nextPhase = (phase: Phase): Phase => {
  if (phase === 'sleep') return 'work'
  if (phase === 'work') return 'tasks'
  return 'sleep'
}
