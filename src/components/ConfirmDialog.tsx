import { useEffect, useRef } from 'react'

interface Props {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ open, title, description, confirmLabel, destructive, onConfirm, onCancel }: Props) {
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (open) confirmRef.current?.focus()
  }, [open])

  if (!open) return null

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onCancel()}>
      <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="dialog-title" aria-describedby="dialog-description">
        <div className="dialog-mark" aria-hidden="true">!</div>
        <h2 id="dialog-title">{title}</h2>
        <p id="dialog-description">{description}</p>
        <div className="dialog-actions">
          <button type="button" className="button button--ghost" onClick={onCancel}>إلغاء</button>
          <button ref={confirmRef} type="button" className={`button ${destructive ? 'button--danger' : 'button--primary'}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
