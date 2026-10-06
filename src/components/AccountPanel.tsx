import { useEffect, useMemo, useRef, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import type { CycleState } from '../features/cycle/types'
import {
  getSupabaseConfig,
  loadRemoteState,
  makeSupabase,
  saveRemoteState,
} from '../lib/supabase'

interface Props {
  state: CycleState
  onRemoteState: (state: CycleState) => void
}

export function AccountPanel({ state, onRemoteState }: Props) {
  const config = useMemo(() => getSupabaseConfig(), [])
  const client = useMemo(() => makeSupabase(config), [config])
  const [user, setUser] = useState<User | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null)
  const hydratedUserRef = useRef<string | null>(null)
  const stateRef = useRef(state)

  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    let mounted = true

    void client.auth.getSession().then(({ data }) => {
      if (mounted) setUser(data.session?.user ?? null)
    })

    const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (!session?.user) hydratedUserRef.current = null
    })

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [client])

  // First sync after login: the newest state wins.
  useEffect(() => {
    if (!user || hydratedUserRef.current === user.id) return
    hydratedUserRef.current = user.id

    void (async () => {
      setBusy(true)
      setMessage('جاري مزامنة بياناتك…')
      try {
        const local = stateRef.current
        const remote = await loadRemoteState(client, user.id)

        if (remote && remote.updatedAt > local.updatedAt) {
          onRemoteState(remote)
          setMessage('تم استرجاع أحدث بياناتك من السحابة.')
        } else {
          await saveRemoteState(client, user.id, local)
          setMessage(remote ? 'تمت مزامنة بياناتك.' : 'تم إنشاء النسخة السحابية الأولى.')
        }

        setLastSyncedAt(Date.now())
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'تعذرت المزامنة.')
      } finally {
        setBusy(false)
      }
    })()
  }, [client, user, onRemoteState])

  // Receive changes from the same account on other devices in real time.
  useEffect(() => {
    if (!user || hydratedUserRef.current !== user.id) return

    const channel = client
      .channel(`user-app-state:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_app_state',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const record = payload.new as { state?: CycleState }
          const remote = record.state
          if (!remote || remote.version !== 1) return
          if (remote.updatedAt <= stateRef.current.updatedAt) return

          onRemoteState(remote)
          setLastSyncedAt(Date.now())
          setMessage('تم تحديث بياناتك من جهاز آخر.')
        },
      )
      .subscribe()

    return () => {
      void client.removeChannel(channel)
    }
  }, [client, user, onRemoteState])

  // Offline-first autosave. Local Redux/localStorage stays immediate.
  useEffect(() => {
    if (!user || hydratedUserRef.current !== user.id) return

    const timer = window.setTimeout(() => {
      void saveRemoteState(client, user.id, state)
        .then(() => setLastSyncedAt(Date.now()))
        .catch(() => undefined)
    }, 700)

    return () => window.clearTimeout(timer)
  }, [client, state, user])

  const run = async (work: () => Promise<void>) => {
    setBusy(true)
    setMessage('')
    try {
      await work()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'حدث خطأ غير متوقع.')
    } finally {
      setBusy(false)
    }
  }

  if (!user) {
    return (
      <div className="sync-box">
        <div className="account-badge">☁ حساب واحد — نفس العداد على كل أجهزتك</div>
        <div className="sync-fields">
          <input
            aria-label="البريد الإلكتروني"
            type="email"
            autoComplete="email"
            placeholder="البريد الإلكتروني"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            aria-label="كلمة المرور"
            type="password"
            autoComplete="current-password"
            placeholder="كلمة المرور — 8 أحرف على الأقل"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="sync-actions">
          <button
            className="button button--primary"
            disabled={busy || !email || password.length < 8}
            onClick={() => void run(async () => {
              const { error } = await client.auth.signInWithPassword({ email, password })
              if (error) throw error
              setMessage('تم تسجيل الدخول.')
            })}
          >
            تسجيل الدخول
          </button>
          <button
            className="button button--secondary"
            disabled={busy || !email || password.length < 8}
            onClick={() => void run(async () => {
              const { data, error } = await client.auth.signUp({ email, password })
              if (error) throw error
              setMessage(
                data.session
                  ? 'تم إنشاء الحساب وتسجيل الدخول.'
                  : 'تم إنشاء الحساب. افتح رسالة التفعيل في بريدك ثم سجّل الدخول.',
              )
            })}
          >
            إنشاء حساب
          </button>
        </div>
        {message && <p className="sync-message" role="status">{message}</p>}
      </div>
    )
  }

  return (
    <div className="sync-box account-connected">
      <div className="account-row">
        <div>
          <span className="eyebrow">متصل ومزامن</span>
          <strong>{user.email}</strong>
          <small>
            {lastSyncedAt
              ? `آخر مزامنة ${new Date(lastSyncedAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}`
              : 'المزامنة تلقائية بين أجهزتك'}
          </small>
        </div>
        <span className="account-status-dot" aria-label="متصل" />
      </div>
      <div className="sync-actions">
        <button
          className="button button--secondary"
          disabled={busy}
          onClick={() => void run(async () => {
            const local = stateRef.current
            const remote = await loadRemoteState(client, user.id)

            if (remote && remote.updatedAt > local.updatedAt) {
              onRemoteState(remote)
              setMessage('تم تحميل أحدث نسخة من السحابة.')
            } else {
              await saveRemoteState(client, user.id, local)
              setMessage('أنت على أحدث نسخة.')
            }

            setLastSyncedAt(Date.now())
          })}
        >
          مزامنة الآن
        </button>
        <button
          className="button button--ghost"
          disabled={busy}
          onClick={() => void run(async () => {
            await client.auth.signOut()
            setMessage('تم تسجيل الخروج.')
          })}
        >
          تسجيل الخروج
        </button>
      </div>
      {message && <p className="sync-message" role="status">{message}</p>}
    </div>
  )
}
