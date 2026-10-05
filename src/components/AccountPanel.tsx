import { useEffect, useMemo, useRef, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import type { CycleState } from '../features/cycle/types'
import {
  clearSupabaseConfig,
  getSupabaseConfig,
  loadRemoteState,
  makeSupabase,
  saveRemoteState,
  saveSupabaseConfig,
  type SupabaseConfig,
} from '../lib/supabase'

interface Props {
  state: CycleState
  onRemoteState: (state: CycleState) => void
}

export function AccountPanel({ state, onRemoteState }: Props) {
  const [config, setConfig] = useState<SupabaseConfig | null>(() => getSupabaseConfig())
  const [draftUrl, setDraftUrl] = useState(config?.url ?? '')
  const [draftKey, setDraftKey] = useState(config?.key ?? '')
  const client = useMemo(() => (config ? makeSupabase(config) : null), [config])
  const [user, setUser] = useState<User | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null)
  const hydratedUserRef = useRef<string | null>(null)

  useEffect(() => {
    if (!client) return
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

  // First sync after login: newest timestamp wins.
  useEffect(() => {
    if (!client || !user || hydratedUserRef.current === user.id) return
    hydratedUserRef.current = user.id

    void (async () => {
      setBusy(true)
      setMessage('جاري مزامنة بياناتك…')
      try {
        const remote = await loadRemoteState(client, user.id)
        if (remote && remote.updatedAt > state.updatedAt) {
          onRemoteState(remote)
          setMessage('تم استرجاع أحدث بياناتك من الحساب.')
        } else {
          await saveRemoteState(client, user.id, state)
          setMessage(remote ? 'تمت مزامنة بياناتك.' : 'تم إنشاء النسخة السحابية الأولى.')
        }
        setLastSyncedAt(Date.now())
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'تعذرت المزامنة.')
      } finally {
        setBusy(false)
      }
    })()
    // state intentionally excluded: this is only the login hydration pass.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, user, onRemoteState])

  // Offline-first autosave. Local state is already stored immediately by Redux.
  useEffect(() => {
    if (!client || !user || hydratedUserRef.current !== user.id) return
    const timer = window.setTimeout(() => {
      void saveRemoteState(client, user.id, state)
        .then(() => setLastSyncedAt(Date.now()))
        .catch(() => undefined)
    }, 900)
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

  if (!config) {
    return (
      <div className="sync-box account-setup">
        <strong>إعداد التخزين السحابي مرة واحدة</strong>
        <p className="sync-message">أنشئ مشروع Supabase مجاني، ثم الصق Project URL وPublishable/anon key هنا. بعدها تظهر شاشة تسجيل الدخول.</p>
        <div className="sync-fields sync-fields--stacked">
          <input dir="ltr" aria-label="Supabase Project URL" placeholder="https://xxxx.supabase.co" value={draftUrl} onChange={(e) => setDraftUrl(e.target.value)} />
          <input dir="ltr" aria-label="Supabase publishable key" placeholder="sb_publishable_... أو anon key" value={draftKey} onChange={(e) => setDraftKey(e.target.value)} />
        </div>
        <div className="sync-actions">
          <button
            className="button button--primary"
            disabled={!draftUrl.startsWith('http') || draftKey.length < 20}
            onClick={() => {
              const next = { url: draftUrl.trim(), key: draftKey.trim() }
              saveSupabaseConfig(next)
              setConfig(next)
              setMessage('تم حفظ إعداد المشروع.')
            }}
          >
            حفظ وإكمال
          </button>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="sync-box">
        <div className="account-badge">☁ حسابك يحفظ تقدمك على أجهزتك</div>
        <div className="sync-fields">
          <input aria-label="البريد الإلكتروني" type="email" autoComplete="email" placeholder="البريد الإلكتروني" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input aria-label="كلمة المرور" type="password" autoComplete="current-password" placeholder="كلمة المرور — 8 أحرف على الأقل" value={password} onChange={(e) => setPassword(e.target.value)} />
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
              setMessage(data.session ? 'تم إنشاء الحساب وتسجيل الدخول.' : 'تم إنشاء الحساب. إذا كان تأكيد البريد مفعلاً، افتح رسالة التفعيل ثم سجّل الدخول.')
            })}
          >
            إنشاء حساب
          </button>
          <button
            className="button button--ghost"
            disabled={busy}
            onClick={() => {
              clearSupabaseConfig()
              setConfig(null)
              setDraftUrl('')
              setDraftKey('')
            }}
          >
            تغيير إعداد المشروع
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
          <span className="eyebrow">متصل</span>
          <strong>{user.email}</strong>
          <small>{lastSyncedAt ? `آخر مزامنة ${new Date(lastSyncedAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}` : 'المزامنة تلقائية'}</small>
        </div>
        <span className="account-status-dot" aria-label="متصل" />
      </div>
      <div className="sync-actions">
        <button
          className="button button--secondary"
          disabled={busy}
          onClick={() => void run(async () => {
            const remote = await loadRemoteState(client, user.id)
            if (!remote) {
              setMessage('لا توجد نسخة سحابية بعد.')
              return
            }
            onRemoteState(remote)
            setLastSyncedAt(Date.now())
            setMessage('تم تحميل النسخة السحابية.')
          })}
        >
          استرجاع من السحابة
        </button>
        <button className="button button--ghost" disabled={busy} onClick={() => void run(async () => { await client.auth.signOut(); setMessage('تم تسجيل الخروج.') })}>
          تسجيل الخروج
        </button>
      </div>
      {message && <p className="sync-message" role="status">{message}</p>}
    </div>
  )
}
