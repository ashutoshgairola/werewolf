import { useEffect, type ReactNode } from 'react'

interface ModalProps {
  open: boolean
  onClose?: () => void
  title?: string
  children: ReactNode
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-ink/60 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Card */}
      <div className="relative z-10 bg-parchment border-2 border-wood rounded-lg shadow-2xl w-full max-w-md p-6 animate-fade-in">
        {title && (
          <h2 className="font-tavern text-xl text-wood-dark mb-4">{title}</h2>
        )}
        {children}
      </div>
    </div>
  )
}
