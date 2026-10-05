import { PHASE_DURATION_MS, PHASE_META } from '../features/cycle/constants'
import type { Phase, PhaseStatus } from '../features/cycle/types'
import { formatClock, formatDuration } from '../lib/time'
import { PhaseIcon } from './PhaseIcon'

interface Props {
  phase: Phase
  status: PhaseStatus
  remainingMs: number | null
  endsAt: number | null
  onComplete: () => void
}

const statusLabels: Record<PhaseStatus, string> = {
  done: 'مكتملة',
  running: 'جارية الآن',
  ready: 'جاهزة للتأشير',
  locked: 'مقفلة',
}

export function PhaseCard({ phase, status, remainingMs, endsAt, onComplete }: Props) {
  const meta = PHASE_META[phase]
  const isEnabled = status === 'ready'
  const isDone = status === 'done'

  return (
    <article className={`phase-card phase-card--${phase} phase-card--${status}`} aria-labelledby={`${phase}-title`}>
      <div className="card-topline">
        <span className="phase-index" aria-hidden="true">{meta.short}</span>
        <span className={`status-pill status-pill--${status}`}>
          <span className="status-dot" aria-hidden="true" />
          {statusLabels[status]}
        </span>
      </div>

      <div className="icon-shell"><PhaseIcon phase={phase} /></div>

      <div className="phase-copy">
        <h2 id={`${phase}-title`}>{meta.title}</h2>
        <p>{meta.description}</p>
      </div>

      <div className="timer-shell" aria-live={status === 'running' ? 'off' : 'polite'}>
        <span className="timer-label">
          {status === 'running' ? 'الوقت المتبقي' : status === 'ready' ? 'انتهى الوقت' : status === 'done' ? 'تم الإنجاز' : 'بانتظار الدور'}
        </span>
        <span className="timer-value" role="timer" aria-label={`مؤقت ${meta.title}`}>
          {status === 'running' && remainingMs !== null
            ? formatDuration(remainingMs)
            : status === 'ready' || status === 'done'
              ? '00:00:00'
              : formatDuration(PHASE_DURATION_MS)}
        </span>
        <span className="timer-footnote">
          {status === 'running' && endsAt
            ? `ينتهي تقريباً ${formatClock(endsAt)}`
            : status === 'ready'
              ? 'يمكنك الآن الانتقال للفترة التالية'
              : isDone
                ? 'تم حفظها في هذه الدورة'
                : 'سيُفتح تلقائياً عند دوره'}
        </span>
      </div>

      <button
        className="complete-button"
        type="button"
        disabled={!isEnabled}
        onClick={onComplete}
        aria-label={isDone ? `تم إكمال ${meta.title}` : `تأشير ${meta.title} كمكتملة`}
      >
        <span className="checkmark" aria-hidden="true">✓</span>
        <span>{isDone ? 'تم' : isEnabled ? 'تأشير كمكتملة' : status === 'running' ? 'مقفلة حتى انتهاء الوقت' : 'غير متاحة الآن'}</span>
      </button>
    </article>
  )
}
