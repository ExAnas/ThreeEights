import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { ConfirmDialog } from './components/ConfirmDialog'
import { PhaseCard } from './components/PhaseCard'
import { SettingsPanel } from './components/SettingsPanel'
import { AccountPanel } from './components/AccountPanel'
import { PHASE_META, PHASES } from './features/cycle/constants'
import {
  completePhase,
  markTimerNotified,
  replaceFromSync,
  resetCurrentCycle,
  startNewCycle,
  undoLastCompletion,
} from './features/cycle/cycleSlice'
import { getPhaseStatus, getRemainingMs, selectCycle } from './features/cycle/selectors'
import type { Phase } from './features/cycle/types'
import { getNotificationPermission, playReadyTone, requestNotifications, showPhaseReadyNotification } from './lib/notifications'
import { cancelNativePhaseNotification, isTauriDesktop, scheduleNativePhaseNotification } from './lib/native'
import { SOUND_KEY, THEME_KEY } from './lib/persistence'
import type { AppDispatch } from './store'

type ConfirmAction = 'undo' | 'reset' | 'new-cycle' | null

function getInitialTheme(): 'light' | 'dark' {
  const saved = localStorage.getItem(THEME_KEY)
  if (saved === 'light' || saved === 'dark') return saved
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export default function App() {
  const dispatch = useDispatch<AppDispatch>()
  const cycle = useSelector(selectCycle)
  const [now, setNow] = useState(Date.now())
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null)
  const [theme, setTheme] = useState<'light' | 'dark'>(getInitialTheme)
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem(SOUND_KEY) !== 'off')
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>('default')
  const lastTimerRef = useRef<string | null>(null)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  useEffect(() => {
    localStorage.setItem(SOUND_KEY, soundEnabled ? 'on' : 'off')
  }, [soundEnabled])

  useEffect(() => {
    const worker = new Worker(new URL('./workers/ticker.worker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (event: MessageEvent<number>) => setNow(event.data)
    worker.postMessage('start')
    return () => {
      worker.postMessage('stop')
      worker.terminate()
    }
  }, [])

  useEffect(() => {
    void getNotificationPermission().then(setNotificationPermission)
    if (!isTauriDesktop() && 'serviceWorker' in navigator) {
      void navigator.serviceWorker.register('/sw.js').catch(() => undefined)
    }
  }, [])

  useEffect(() => {
    const timer = cycle.timer
    if (!timer) {
      void cancelNativePhaseNotification().catch(() => undefined)
      return
    }
    void scheduleNativePhaseNotification(timer.phase, PHASE_META[timer.phase].title, timer.endsAt).catch(() => undefined)
  }, [cycle.timer])

  useEffect(() => {
    const timer = cycle.timer
    if (!timer || now < timer.endsAt) return

    const key = `${cycle.cycleNumber}:${timer.phase}:${timer.endsAt}`
    if (cycle.lastNotifiedKey === key || lastTimerRef.current === key) return
    lastTimerRef.current = key

    const title = PHASE_META[timer.phase].title
    if (soundEnabled) playReadyTone()
    void showPhaseReadyNotification(title)
    dispatch(markTimerNotified({ key, now }))
  }, [cycle, dispatch, now, soundEnabled])

  const completedCount = useMemo(() => PHASES.filter((phase) => cycle.completed[phase]).length, [cycle.completed])
  const progress = (completedCount / PHASES.length) * 100
  const canUndo = completedCount > 0
  const cycleDone = cycle.currentPhase === null

  const complete = (phase: Phase) => dispatch(completePhase({ phase, now: Date.now() }))

  const performConfirmedAction = () => {
    const timestamp = Date.now()
    if (confirmAction === 'undo') dispatch(undoLastCompletion({ now: timestamp }))
    if (confirmAction === 'reset') dispatch(resetCurrentCycle({ now: timestamp }))
    if (confirmAction === 'new-cycle') dispatch(startNewCycle({ now: timestamp }))
    setConfirmAction(null)
  }

  const dialogCopy = {
    undo: {
      title: 'التراجع عن آخر تأشير؟',
      description: 'سيُلغى المؤقت الذي بدأ بعد آخر تأشير، وتعود آخر فترة مكتملة إلى حالة جاهزة. لن تتأثر الفترات الأقدم.',
      label: 'تراجع',
      destructive: false,
    },
    reset: {
      title: 'إعادة ضبط هذه الدورة؟',
      description: 'ستُمسح علامات الإكمال والمؤقت الحالي وتعود الدورة إلى النوم. هذا الإجراء لا يمكن استرجاعه.',
      label: 'إعادة الضبط',
      destructive: true,
    },
    'new-cycle': {
      title: 'بدء دورة جديدة؟',
      description: 'ستبدأ دورة جديدة من النوم، مع الاحتفاظ برقم الدورة السابقة كمرجع فقط.',
      label: 'ابدأ الدورة',
      destructive: false,
    },
  } as const

  const currentDialog = confirmAction ? dialogCopy[confirmAction] : null

  return (
    <div className="app-shell">
      <div className="ambient ambient--one" aria-hidden="true" />
      <div className="ambient ambient--two" aria-hidden="true" />

      <header className="site-header">
        <a href="#main" className="brand" aria-label="8 في 3 — الصفحة الرئيسية">
          <span className="brand-mark">8×3</span>
          <span className="brand-copy"><strong>يوم متوازن</strong><small>24 ساعة. ثلاث أولويات.</small></span>
        </a>
        <div className="header-actions">
          <button className="icon-button" type="button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label={theme === 'dark' ? 'تفعيل الوضع الفاتح' : 'تفعيل الوضع الليلي'}>
            {theme === 'dark' ? '☀' : '◐'}
          </button>
          <button className="icon-button" type="button" onClick={() => setSettingsOpen(true)} aria-label="فتح الإعدادات">⚙</button>
        </div>
      </header>

      <main id="main" className="main-content">
        <section className="hero" aria-labelledby="page-title">
          <div className="hero-copy">
            <span className="eyebrow">الدورة {cycle.cycleNumber}</span>
            <h1 id="page-title">كل شيء يأخذ<br /><em>ثماني ساعات.</em></h1>
            <p>لا انتقال مبكر، ولا مؤقت هش. أكمل الفترة، اترك التالية تأخذ وقتها، ثم انتقل عندما تصبح جاهزة.</p>
          </div>

          <div className="progress-card" aria-label={`تقدم الدورة ${completedCount} من 3`}>
            <div className="progress-ring" style={{ '--progress': `${progress * 3.6}deg` } as CSSProperties}>
              <div className="progress-ring__inner"><strong>{completedCount}<span>/3</span></strong><small>مكتملة</small></div>
            </div>
            <div className="progress-copy"><strong>{cycleDone ? 'الدورة مكتملة' : 'تقدّم ثابت، بدون قفز'}</strong><span>{cycleDone ? 'يمكنك بدء دورة جديدة الآن.' : 'كل بطاقة تُفتح فقط عندما يحين دورها.'}</span></div>
          </div>
        </section>

        <section className="phase-grid" aria-label="فترات اليوم الثلاث">
          {PHASES.map((phase) => {
            const status = getPhaseStatus(cycle, phase, now)
            const remaining = getRemainingMs(cycle, phase, now)
            const endsAt = cycle.timer?.phase === phase ? cycle.timer.endsAt : null
            return <PhaseCard key={phase} phase={phase} status={status} remainingMs={remaining} endsAt={endsAt} onComplete={() => complete(phase)} />
          })}
        </section>

        <section className="control-bar" aria-label="إجراءات الدورة">
          <div className="control-copy">
            <span className="eyebrow">التحكم</span>
            <strong>{cycleDone ? 'أنهيت المراحل الثلاث.' : canUndo ? 'يمكنك التراجع فقط عن آخر خطوة.' : 'ابدأ بتأشير النوم عند اكتماله.'}</strong>
          </div>
          <div className="control-actions">
            {cycleDone && <button className="button button--primary" type="button" onClick={() => setConfirmAction('new-cycle')}>دورة جديدة</button>}
            <button className="button button--secondary" type="button" disabled={!canUndo} onClick={() => setConfirmAction('undo')}>تراجع عن آخر تأشير</button>
            <button className="button button--ghost" type="button" onClick={() => setConfirmAction('reset')}>إعادة الضبط</button>
          </div>
        </section>

        <section className="sync-section" aria-labelledby="sync-title">
          <div className="section-heading"><span className="eyebrow">حسابك</span><h2 id="sync-title">احفظ يومك تلقائياً</h2><p>يعمل التطبيق بدون إنترنت أولاً، ثم يزامن الحالة مع حسابك عند توفر الشبكة. إذا غيرت جهازك، سجل دخولك واسترجع تقدمك.</p></div>
          <AccountPanel state={cycle} onRemoteState={(remote) => dispatch(replaceFromSync(remote))} />
        </section>
      </main>

      <footer className="site-footer"><span>8×3</span><span>يعمل محلياً حتى بدون حساب.</span></footer>

      <SettingsPanel
        open={settingsOpen}
        theme={theme}
        soundEnabled={soundEnabled}
        notificationPermission={notificationPermission}
        onClose={() => setSettingsOpen(false)}
        onThemeToggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        onSoundToggle={() => setSoundEnabled(!soundEnabled)}
        onEnableNotifications={() => void requestNotifications().then(setNotificationPermission)}
      />
      {settingsOpen && <button className="settings-scrim" aria-label="إغلاق الإعدادات" onClick={() => setSettingsOpen(false)} />}

      {currentDialog && (
        <ConfirmDialog
          open
          title={currentDialog.title}
          description={currentDialog.description}
          confirmLabel={currentDialog.label}
          destructive={currentDialog.destructive}
          onConfirm={performConfirmedAction}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  )
}
