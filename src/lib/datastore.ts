import { WeeklyReport, Transaction, ID } from '@/types'

export interface DataStore {
  getReports(): WeeklyReport[]
  saveReport(r: WeeklyReport): void
  updateReport(r: WeeklyReport): void
  deleteReport(id: ID): void

  getTransactions(): Transaction[]
  saveTransaction(t: Transaction): void
  updateTransaction(t: Transaction): void
  deleteTransaction(id: ID): void
}

const REPORTS_KEY = 'lt:reports:v1'
const TX_KEY = 'lt:transactions:v1'

export class LocalStore implements DataStore {
  getReports(): WeeklyReport[] {
    const j = localStorage.getItem(REPORTS_KEY)
    return j ? JSON.parse(j) : []
  }
  saveReport(r: WeeklyReport): void {
    const all = this.getReports()
    all.push(r)
    localStorage.setItem(REPORTS_KEY, JSON.stringify(all))
  }
  updateReport(r: WeeklyReport): void {
    const all = this.getReports().map(x => x.id === r.id ? r : x)
    localStorage.setItem(REPORTS_KEY, JSON.stringify(all))
  }
  deleteReport(id: ID): void {
    const all = this.getReports().filter(x => x.id !== id)
    localStorage.setItem(REPORTS_KEY, JSON.stringify(all))
  }
  getTransactions(): Transaction[] {
    const j = localStorage.getItem(TX_KEY)
    return j ? JSON.parse(j) : []
  }
  saveTransaction(t: Transaction): void {
    const all = this.getTransactions()
    all.push(t)
    localStorage.setItem(TX_KEY, JSON.stringify(all))
  }
  updateTransaction(t: Transaction): void {
    const all = this.getTransactions().map(x => x.id === t.id ? t : x)
    localStorage.setItem(TX_KEY, JSON.stringify(all))
  }
  deleteTransaction(id: ID): void {
    const all = this.getTransactions().filter(x => x.id !== id)
    localStorage.setItem(TX_KEY, JSON.stringify(all))
  }
}

export const store = new LocalStore()

