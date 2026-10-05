import type { Phase } from '../features/cycle/types'

export function PhaseIcon({ phase }: { phase: Phase }) {
  if (phase === 'sleep') {
    return (
      <svg viewBox="0 0 48 48" aria-hidden="true" className="phase-icon">
        <path d="M33.8 33.2c-9.6 0-17.4-7.8-17.4-17.4 0-2.7.6-5.2 1.7-7.5C11.1 10.6 6 17.1 6 24.8 6 34.3 13.7 42 23.2 42c7.7 0 14.2-5.1 16.5-12.1a17.1 17.1 0 0 1-5.9 3.3Z" fill="currentColor" />
      </svg>
    )
  }

  if (phase === 'work') {
    return (
      <svg viewBox="0 0 48 48" aria-hidden="true" className="phase-icon">
        <path d="M17 11.5A4.5 4.5 0 0 1 21.5 7h5A4.5 4.5 0 0 1 31 11.5V14h5.5A5.5 5.5 0 0 1 42 19.5v16a5.5 5.5 0 0 1-5.5 5.5h-25A5.5 5.5 0 0 1 6 35.5v-16A5.5 5.5 0 0 1 11.5 14H17v-2.5Zm4 0V14h6v-2.5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0-.5.5ZM10 24v11.5c0 .8.7 1.5 1.5 1.5h25c.8 0 1.5-.7 1.5-1.5V24c-4.1 2.1-8.9 3.2-14 3.2S14.1 26.1 10 24Zm28-4.5c0-.8-.7-1.5-1.5-1.5h-25c-.8 0-1.5.7-1.5 1.5v.1c3.9 2.4 8.7 3.6 14 3.6s10.1-1.2 14-3.6v-.1Z" fill="currentColor" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className="phase-icon">
      <path d="M34.5 6A7.5 7.5 0 0 1 42 13.5v21A7.5 7.5 0 0 1 34.5 42h-21A7.5 7.5 0 0 1 6 34.5v-21A7.5 7.5 0 0 1 13.5 6h21Zm-3.2 10.7-10.8 11-4.1-4a2 2 0 0 0-2.8 2.8l5.5 5.4a2 2 0 0 0 2.8 0l12.2-12.4a2 2 0 0 0-2.8-2.8Z" fill="currentColor" />
    </svg>
  )
}
