import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { WeeklyReport, Transaction, ID } from './types'
import { uid } from './lib/utils'

// One-time legacy hydration: if the new Zustand key has no data yet,
// attempt to load from the old per-collection keys used previously.
function loadLegacyData(): { reports: WeeklyReport[]; transactions: Transaction[] } | null {
  try {
    if (typeof localStorage === 'undefined') return null
    // If new store exists, do nothing.
    const NEW_KEY = 'lt:zustand:v1'
    const existing = localStorage.getItem(NEW_KEY)
    if (existing) return null

    const LEGACY_R = 'lt:reports:v1'
    const LEGACY_T = 'lt:transactions:v1'
    const rs = localStorage.getItem(LEGACY_R)
    const ts = localStorage.getItem(LEGACY_T)
    const reports = rs ? JSON.parse(rs) as WeeklyReport[] : []
    const transactions = ts ? JSON.parse(ts) as Transaction[] : []
    if ((reports?.length || 0) + (transactions?.length || 0) > 0) {
      // Seed a flag so the UI can show a toast after mount and
      // clean up old keys once we've taken ownership of the data.
      try {
        localStorage.setItem('lt:migrated-from-legacy', '1')
        localStorage.removeItem(LEGACY_R)
        localStorage.removeItem(LEGACY_T)
      } catch { /* ignore */ }
      return { reports, transactions }
    }
  } catch {
    // ignore
  }
  return null
}

type State = {
  reports: WeeklyReport[]
  transactions: Transaction[]
}

type Actions = {
  addReport: (r: Omit<WeeklyReport,'id'|'createdAt'|'totalSales'> & { totalSales?: number }) => void
  updateReport: (r: WeeklyReport) => void
  deleteReport: (id: ID) => void

  addTransaction: (t: Omit<Transaction,'id'|'createdAt'>) => void
  updateTransaction: (t: Transaction) => void
  deleteTransaction: (id: ID) => void
}

const legacy = loadLegacyData()

export const useStore = create<State & Actions>()(persist((set, get) => ({
  reports: legacy?.reports ?? [],
  transactions: legacy?.transactions ?? [],

  addReport: (r) => set((s) => ({
    reports: [...s.reports, {
      ...r,
      // Sales (RM) is defined as Online + Offline only
      totalSales: r.totalSales ?? (r.online + r.offline),
      id: uid(),
      createdAt: new Date().toISOString(),
    }],
  })),

  updateReport: (r) => set((s)=>({ reports: s.reports.map(x => x.id === r.id ? r : x) })),
  deleteReport: (id) => set((s)=>({ reports: s.reports.filter(x => x.id !== id) })),

  addTransaction: (t) => set((s)=>({ transactions: [...s.transactions, { ...t, id: uid(), createdAt: new Date().toISOString() }] })),
  updateTransaction: (t) => set((s)=>({ transactions: s.transactions.map(x => x.id === t.id ? t : x) })),
  deleteTransaction: (id) => set((s)=>({ transactions: s.transactions.filter(x => x.id !== id) })),
}),{ 
  name: 'lt:zustand:v1',
  version: 2,
  migrate: (state: any, version) => {
    // v0 -> v1: normalize transactions so expenses and refunds are stored as negative amounts
    if (version < 1 && state && Array.isArray(state.transactions)) {
      state.transactions = state.transactions.map((t: any) => ({
        ...t,
        amount: -Math.abs(Number(t.amount || 0)),
      }))
    }
    // v1 -> v2: ensure WeeklyReport.totalSales equals Online + Offline
    if (version < 2 && state && Array.isArray(state.reports)) {
      state.reports = state.reports.map((r: any) => ({
        ...r,
        totalSales: Number(r.online || 0) + Number(r.offline || 0),
      }))
    }
    return state
  }
}))
