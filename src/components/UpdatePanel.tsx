import { useEffect, useMemo, useState } from 'react'
import { getVersion } from '@tauri-apps/api/app'
import { check } from '@tauri-apps/plugin-updater'
import { isTauriDesktop } from '../lib/native'

type UpdateStatus = 'idle' | 'checking' | 'available' | 'latest' | 'downloading' | 'error' | 'unsupported'

export function UpdatePanel() {
  const [currentVersion, setCurrentVersion] = useState('…')
  const [status, setStatus] = useState<UpdateStatus>('idle')
  const [message, setMessage] = useState('يمكنك التحقق يدويًا، وسيفحص التطبيق أيضًا عند فتح الإعدادات.')
  const [update, setUpdate] = useState<Awaited<ReturnType<typeof check>>>(null)
  const [downloadedBytes, setDownloadedBytes] = useState(0)
  const [totalBytes, setTotalBytes] = useState<number | null>(null)

  const progress = useMemo(() => {
    if (!totalBytes || totalBytes <= 0) return null
    return Math.min(100, Math.round((downloadedBytes / totalBytes) * 100))
  }, [downloadedBytes, totalBytes])

  const checkForUpdate = async (silent = false) => {
    if (!isTauriDesktop()) {
      setStatus('unsupported')
      setMessage('التحديث داخل التطبيق متاح في نسخة Windows فقط.')
      return
    }

    setStatus('checking')
    if (!silent) setMessage('جاري التحقق من أحدث إصدار…')

    try {
      const result = await check()
      setUpdate(result)

      if (result) {
        setStatus('available')
        setMessage(`يتوفر الإصدار ${result.version}. يمكنك تنزيله وتثبيته الآن.`)
      } else {
        setStatus('latest')
        setMessage('أنت على أحدث إصدار متاح.')
      }
    } catch (error) {
      setStatus('error')
      setMessage(error instanceof Error ? `تعذر التحقق من التحديث: ${error.message}` : 'تعذر التحقق من التحديث.')
    }
  }

  useEffect(() => {
    if (!isTauriDesktop()) {
      setStatus('unsupported')
      setMessage('التحديث داخل التطبيق متاح في نسخة Windows فقط.')
      return
    }

    void getVersion().then(setCurrentVersion).catch(() => setCurrentVersion('غير معروف'))
    void checkForUpdate(true)
  }, [])

  const installUpdate = async () => {
    if (!update) return

    setStatus('downloading')
    setDownloadedBytes(0)
    setTotalBytes(null)
    setMessage(`جاري تنزيل الإصدار ${update.version}…`)

    let downloaded = 0

    try {
      await update.downloadAndInstall((event) => {
        if (event.event === 'Started') {
          setTotalBytes(event.data.contentLength ?? null)
          setMessage(`جاري تنزيل الإصدار ${update.version}…`)
        }

        if (event.event === 'Progress') {
          downloaded += event.data.chunkLength
          setDownloadedBytes(downloaded)
        }

        if (event.event === 'Finished') {
          setMessage('اكتمل التنزيل. سيبدأ التثبيت الآن ثم يعاد تشغيل التطبيق.')
        }
      })
    } catch (error) {
      setStatus('error')
      setMessage(error instanceof Error ? `تعذر تثبيت التحديث: ${error.message}` : 'تعذر تثبيت التحديث.')
    }
  }

  return (
    <div className="setting-row setting-row--stacked update-panel">
      <div className="update-heading">
        <div>
          <strong>تحديث التطبيق</strong>
          <span>الإصدار الحالي: v{currentVersion}</span>
        </div>
        {update && <span className="update-badge">v{update.version} متاح</span>}
      </div>

      <p className="update-message" role="status">{message}</p>

      {status === 'downloading' && (
        <div className="update-progress" aria-label="تقدم تنزيل التحديث">
          <div className="update-progress__track">
            <div className="update-progress__bar" style={{ width: `${progress ?? 12}%` }} />
          </div>
          <span>{progress === null ? 'جارٍ التنزيل…' : `${progress}%`}</span>
        </div>
      )}

      <div className="update-actions">
        <button
          className="button button--secondary"
          type="button"
          disabled={status === 'checking' || status === 'downloading' || status === 'unsupported'}
          onClick={() => void checkForUpdate(false)}
        >
          {status === 'checking' ? 'جاري التحقق…' : 'التحقق من وجود تحديث'}
        </button>

        {status === 'available' && update && (
          <button className="button button--primary" type="button" onClick={() => void installUpdate()}>
            تنزيل وتثبيت v{update.version}
          </button>
        )}
      </div>
    </div>
  )
}
