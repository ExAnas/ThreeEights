import { PHASE_DURATION_MS, PHASE_META } from '../features/cycle/constants'
import type { Phase, PhaseStatus } from '../features/cycle/types'
import { formatClock, formatDuration } from '../lib/time'
import { PhaseIcon } from './PhaseIcon'

interface Props {
  phase: Phase
  status: PhaseStatus
  remainingMs: number | null
  endsAt: number | null
  onStart: () => void
}

const statusLabels: Record<PhaseStatus, string> = {
  done: 'مكتملة',
  running: 'جارية الآن',
  ready: 'جاهزة للبدء',
  locked: 'بانتظار الدور',
}

export function PhaseCard({ phase, status, remainingMs, endsAt, onStart }: Props) {
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
          {status === 'running'
            ? 'الوقت المتبقي'
            : status === 'ready'
              ? 'جاهزة للبدء'
              : status === 'done'
                ? 'مكتملة في هذه الدورة'
                : 'بانتظار الدور'}
        </span>
        <span className="timer-value" role="timer" aria-label={`مؤقت ${meta.title}`}>
          {status === 'running' && remainingMs !== null
            ? formatDuration(remainingMs)
            : status === 'ready' || status === 'locked'
              ? formatDuration(PHASE_DURATION_MS)
              : '00:00:00'}
        </span>
        <span className="timer-footnote">
          {status === 'running' && endsAt
            ? `تنتهي تقريباً ${formatClock(endsAt)} ثم تبدأ التالية تلقائياً`
            : status === 'ready'
              ? 'يمكنك بدء الدورة من هذه الفترة'
              : isDone
                ? 'تم احتسابها في هذه الدورة'
                : 'ستبدأ تلقائياً بعد انتهاء الفترة الحالية'}
        </span>
      </div>

      <button
        className="complete-button"
        type="button"
        disabled={!isEnabled}
        onClick={onStart}
        aria-label={isDone ? `تم إكمال ${meta.title}` : `بدء فترة ${meta.title}`}
      >
        <span className="checkmark" aria-hidden="true">{isEnabled ? '▶' : isDone ? '✓' : '•'}</span>
        <span>
          {isDone
            ? 'مكتملة'
            : isEnabled
              ? 'ابدأ 8 ساعات'
              : status === 'running'
                ? 'جارية الآن'
                : 'تبدأ بعد الفترة الحالية'}
        </span>
      </button>
    </article>
  )
}
