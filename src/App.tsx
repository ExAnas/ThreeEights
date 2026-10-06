import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { ConfirmDialog } from './components/ConfirmDialog'
import { PhaseCard } from './components/PhaseCard'
import { SettingsPanel } from './components/SettingsPanel'
import { AccountPanel } from './components/AccountPanel'
import { PHASE_META, PHASES, nextPhase } from './features/cycle/constants'
import {
  advanceCycle,
  replaceFromSync,
  resetCurrentCycle,
  startPhase,
} from './features/cycle/cycleSlice'
import { getPhaseStatus, getRemainingMs, selectCycle } from './features/cycle/selectors'
import type { Phase } from './features/cycle/types'
import { getNotificationPermission, playReadyTone, requestNotifications, showPhaseReadyNotification } from './lib/notifications'
import { cancelNativePhaseNotification, isTauriDesktop, resetNativeTrayCountdown, scheduleNativePhaseNotification, updateNativeTrayCountdown } from './lib/native'
import { SOUND_KEY, THEME_KEY } from './lib/persistence'
import type { AppDispatch } from './store'

type ConfirmAction = 'reset' | null

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
      void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => undefined)
    }
  }, [])

  useEffect(() => {
    const timer = cycle.timer
    if (!timer) {
      void cancelNativePhaseNotification().catch(() => undefined)
      return
    }

    const upcoming = nextPhase(timer.phase)
    void scheduleNativePhaseNotification(
      timer.phase,
      PHASE_META[timer.phase].title,
      PHASE_META[upcoming].title,
      timer.endsAt,
    ).catch(() => undefined)
  }, [cycle.timer])

  useEffect(() => {
    const timer = cycle.timer
    if (!timer) {
      void resetNativeTrayCountdown().catch(() => undefined)
      return
    }

    void updateNativeTrayCountdown(
      PHASE_META[timer.phase].title,
      Math.max(0, timer.endsAt - now),
    ).catch(() => undefined)
  }, [cycle.timer, now])

  useEffect(() => {
    const timer = cycle.timer
    if (!timer || now < timer.endsAt) return

    const key = `${cycle.cycleNumber}:${timer.phase}:${timer.endsAt}`
    if (lastTimerRef.current !== key) {
      lastTimerRef.current = key
      const upcoming = nextPhase(timer.phase)
      if (soundEnabled) playReadyTone()
      void showPhaseReadyNotification(PHASE_META[timer.phase].title, PHASE_META[upcoming].title)
    }

    dispatch(advanceCycle({ now }))
  }, [cycle.cycleNumber, cycle.timer, dispatch, now, soundEnabled])

  const completedCount = useMemo(() => PHASES.filter((phase) => cycle.completed[phase]).length, [cycle.completed])
  const progress = (completedCount / PHASES.length) * 100
  const isIdle = cycle.timer === null
  const activeTitle = cycle.timer ? PHASE_META[cycle.timer.phase].title : null

  const start = (phase: Phase) => dispatch(startPhase({ phase, now: Date.now() }))

  const performConfirmedAction = () => {
    if (confirmAction === 'reset') {
      dispatch(resetCurrentCycle({ now: Date.now() }))
    }
    setConfirmAction(null)
  }

  const dialogCopy = {
    reset: {
      title: 'إيقاف الدورة وإعادة الاختيار؟',
      description: 'سيتوقف المؤقت الحالي وتُمسح علامات هذه الدورة، وبعدها يمكنك البدء من النوم أو العمل أو المهام.',
      label: 'إعادة الاختيار',
      destructive: true,
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
            <h1 id="page-title">ابدأ من أي مكان.<br /><em>ثماني ساعات.</em></h1>
            <p>اختر النوم أو العمل أو المهام كنقطة بداية. بعد كل 8 ساعات تنتقل الدورة تلقائياً للفترة التالية، وبعد المهام تبدأ دورة جديدة من النوم.</p>
          </div>

          <div className="progress-card" aria-label={`تقدم الدورة ${completedCount} من 3`}>
            <div className="progress-ring" style={{ '--progress': `${progress * 3.6}deg` } as CSSProperties}>
              <div className="progress-ring__inner"><strong>{completedCount}<span>/3</span></strong><small>مكتملة</small></div>
            </div>
            <div className="progress-copy">
              <strong>{isIdle ? 'اختر نقطة البداية' : 'الدورة تعمل تلقائياً'}</strong>
              <span>{isIdle ? 'ابدأ من أي بطاقة تناسب وقتك الآن.' : `الفترة الحالية: ${activeTitle}. التالية تبدأ تلقائياً عند انتهاء المؤقت.`}</span>
            </div>
          </div>
        </section>

        <section className="phase-grid" aria-label="فترات اليوم الثلاث">
          {PHASES.map((phase) => {
            const status = getPhaseStatus(cycle, phase, now)
            const remaining = getRemainingMs(cycle, phase, now)
            const endsAt = cycle.timer?.phase === phase ? cycle.timer.endsAt : null
            return (
              <PhaseCard
                key={phase}
                phase={phase}
                status={status}
                remainingMs={remaining}
                endsAt={endsAt}
                onStart={() => start(phase)}
              />
            )
          })}
        </section>

        <section className="control-bar" aria-label="إجراءات الدورة">
          <div className="control-copy">
            <span className="eyebrow">التحكم</span>
            <strong>
              {isIdle
                ? 'اختر أي فترة لبدء دورة الـ 8 ساعات.'
                : `${activeTitle} تعمل الآن؛ الانتقال للفترة التالية تلقائي.`}
            </strong>
          </div>
          <div className="control-actions">
            <button className="button button--ghost" type="button" onClick={() => setConfirmAction('reset')}>
              إيقاف وإعادة الاختيار
            </button>
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
