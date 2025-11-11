import { Routes, Route, NavLink } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import DataEntry from './pages/DataEntry'
import Records from './pages/Records'
import { ThemeToggle } from './components/ThemeToggle'
import { ToastContainer } from './components/ToastContainer'
import { useEffect } from 'react'
import { toast } from './components/ToastContainer'

export default function App() {
  useEffect(() => {
    try {
      if (typeof localStorage !== 'undefined' && localStorage.getItem('lt:migrated-from-legacy') === '1') {
        toast.success('Imported data from previous version. Enjoy!')
        localStorage.removeItem('lt:migrated-from-legacy')
      }
    } catch { /* ignore */ }
  }, [])
  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <ToastContainer />
      <header className="border-b border-black/10 dark:border-white/5 sticky top-0 z-20 bg-white/80 dark:bg-gray-950/80 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-brand text-white flex items-center justify-center font-semibold">F</div>
            <span className="font-semibold">Fera Laundry App</span>
          </div>
          <nav className="flex items-center gap-2">
            <NavLink to="/" end className={({isActive}) => `btn ${isActive ? 'bg-black/5 dark:bg-white/10' : 'bg-transparent'} hover:bg-black/5 dark:hover:bg-white/10`}>Dashboard</NavLink>
            <NavLink to="/data" className={({isActive}) => `btn ${isActive ? 'bg-black/5 dark:bg-white/10' : 'bg-transparent'} hover:bg-black/5 dark:hover:bg-white/10`}>Data Entry</NavLink>
            <NavLink to="/records" className={({isActive}) => `btn ${isActive ? 'bg-black/5 dark:bg-white/10' : 'bg-transparent'} hover:bg-black/5 dark:hover:bg-white/10`}>Records</NavLink>
            <ThemeToggle />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route path="/" element={<Dashboard/>} />
          <Route path="/data" element={<DataEntry/>} />
          <Route path="/records" element={<Records/>} />
        </Routes>
      </main>
    </div>
  )
}
