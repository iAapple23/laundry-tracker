import { useEffect, useState } from 'react'
import { notify, subscribeToast, Toast } from '@/lib/toast'

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([])
  useEffect(() => {
    return subscribeToast((t) => {
      setToasts((prev) => [...prev, t])
      setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== t.id)), 4000)
    })
  }, [])
  if (toasts.length === 0) return null
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`px-4 py-2 rounded-md border shadow-card text-sm ${
            t.type === 'success'
              ? 'bg-emerald-100 border-emerald-300 text-emerald-800 dark:bg-emerald-600/20 dark:border-emerald-500/30 dark:text-emerald-200'
              : t.type === 'error'
              ? 'bg-red-100 border-red-300 text-red-800 dark:bg-red-600/20 dark:border-red-500/30 dark:text-red-200'
              : 'bg-gray-100 border-black/10 text-gray-800 dark:bg-gray-700/50 dark:border-white/10 dark:text-gray-100'
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}

// convenience helpers
export const toast = {
  success: (msg: string) => notify('success', msg),
  error: (msg: string) => notify('error', msg),
  info: (msg: string) => notify('info', msg),
}
