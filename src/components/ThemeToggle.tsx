import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const [dark, setDark] = useState(true)
  useEffect(() => {
    const stored = localStorage.getItem('theme:dark')
    const prefers = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    const d = stored ? stored === '1' : prefers
    setDark(d)
    document.documentElement.classList.toggle('dark', d)
  }, [])

  const toggle = () => {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme:dark', next ? '1' : '0')
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      onClick={toggle}
      title="Toggle dark mode"
      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand/60 border ${
        dark ? 'bg-brand border-brand-700/40' : 'bg-gray-300 border-black/20'
      }`}
    >
      <span className="sr-only">Toggle dark mode</span>
      <span
        className={`pointer-events-none absolute left-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs shadow-md transition-transform ${
          dark ? 'translate-x-5' : 'translate-x-0'
        }`}
      >
        {dark ? '🌙' : '☀️'}
      </span>
    </button>
  )
}
