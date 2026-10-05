import { PHASE_DURATION_MS, EIGHT_HOURS_MS } from '../features/cycle/constants'
import { UpdatePanel } from './UpdatePanel'

interface Props {
  open: boolean
  theme: 'light' | 'dark'
  soundEnabled: boolean
  notificationPermission: NotificationPermission | 'unsupported'
  onClose: () => void
  onThemeToggle: () => void
  onSoundToggle: () => void
  onEnableNotifications: () => void
}

export function SettingsPanel({
  open,
  theme,
  soundEnabled,
  notificationPermission,
  onClose,
  onThemeToggle,
  onSoundToggle,
  onEnableNotifications,
}: Props) {
  return (
    <div className={`settings-panel ${open ? 'settings-panel--open' : ''}`} aria-hidden={!open}>
      <div className="settings-head">
        <div>
          <span className="eyebrow">التفضيلات</span>
          <h2>الإعدادات</h2>
        </div>
        <button className="icon-button" type="button" onClick={onClose} aria-label="إغلاق الإعدادات">×</button>
      </div>

      <div className="setting-row">
        <div><strong>الوضع الليلي</strong><span>واجهة مريحة في الإضاءة المنخفضة.</span></div>
        <button className={`switch ${theme === 'dark' ? 'switch--on' : ''}`} type="button" role="switch" aria-checked={theme === 'dark'} onClick={onThemeToggle}>
          <span />
        </button>
      </div>

      <div className="setting-row">
        <div><strong>التنبيه الصوتي</strong><span>نغمة قصيرة عند جاهزية الفترة.</span></div>
        <button className={`switch ${soundEnabled ? 'switch--on' : ''}`} type="button" role="switch" aria-checked={soundEnabled} onClick={onSoundToggle}>
          <span />
        </button>
      </div>

      <div className="setting-row setting-row--stacked">
        <div><strong>الإشعارات</strong><span>في Windows تُرسل كتَنبيه نظام أصلي حتى لو أخفيت النافذة إلى شريط النظام.</span></div>
        <button className="button button--secondary" type="button" onClick={onEnableNotifications} disabled={notificationPermission === 'granted' || notificationPermission === 'unsupported'}>
          {notificationPermission === 'granted' ? 'مفعّلة' : notificationPermission === 'denied' ? 'محظورة من النظام' : notificationPermission === 'unsupported' ? 'غير مدعومة' : 'تفعيل الإشعارات'}
        </button>
      </div>

      <UpdatePanel />

      {PHASE_DURATION_MS !== EIGHT_HOURS_MS && (
        <div className="dev-note" role="note">
          <strong>وضع تجربة نشط</strong>
          <span>مدة الفترة معدّلة عبر متغير البيئة وليست 8 ساعات.</span>
        </div>
      )}
    </div>
  )
}
