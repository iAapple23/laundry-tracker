export type ToastType = 'success' | 'error' | 'info'
export type Toast = { id: string; type: ToastType; message: string }

type Listener = (t: Toast) => void
const listeners = new Set<Listener>()

export function subscribeToast(l: Listener) {
  listeners.add(l)
  return () => { listeners.delete(l) }
}

export function notify(type: ToastType, message: string) {
  const id = Math.random().toString(36).slice(2)
  const toast: Toast = { id, type, message }
  for (const l of listeners) l(toast)
}
