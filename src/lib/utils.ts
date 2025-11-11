import { WeeklyReport, Transaction } from '@/types'
import { eachMonthOfInterval, format, startOfWeek, endOfWeek, startOfDay, endOfDay, addDays, startOfMonth, endOfMonth, subMonths } from 'date-fns'

export const months = [
  'January','February','March','April','May','June','July','August','September','October','November','December'
]

export function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function computeTotals(reports: WeeklyReport[], txs: Transaction[], year: number) {
  const monthly = Array.from({length:12}, ()=>({ sales:0, expenses:0, refunds:0, revenue:0 }))
  for (const r of reports) {
    if (r.year === year) monthly[r.month].sales += r.totalSales
  }
  for (const t of txs) {
    const d = new Date(t.date)
    if (d.getFullYear() !== year) continue
    const m = d.getMonth()
    if (t.type === 'expense') monthly[m].expenses += Math.abs(t.amount)
    else monthly[m].refunds += Math.abs(t.amount)
  }
  for (const m of monthly) m.revenue = m.sales - m.expenses - m.refunds
  const totals = monthly.reduce((acc,m)=>({
    sales: acc.sales+m.sales,
    expenses: acc.expenses+m.expenses,
    refunds: acc.refunds+m.refunds,
    revenue: acc.revenue+m.revenue
  }),{sales:0,expenses:0,refunds:0,revenue:0})
  return { monthly, totals }
}

export function formatCurrency(n: number, currency='MYR') {
  return new Intl.NumberFormat('en-MY', { style: 'currency', currency }).format(n)
}

export function yearMonths(year:number) {
  return eachMonthOfInterval({ start: new Date(year,0,1), end: new Date(year,11,1) })
    .map(d => format(d,'MMM'))
}

export function prevMonthYear(year: number, month: number) {
  return month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 }
}

export function pctChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100
  return ((current - previous) / previous) * 100
}

export function monthlyStats(reports: WeeklyReport[], txs: Transaction[], year: number, month: number) {
  const sales = reports.filter(r=>r.year===year && r.month===month).reduce((s,r)=>s+r.totalSales,0)
  const expenses = txs.filter(t=>{
    const d = new Date(t.date); return d.getFullYear()===year && d.getMonth()===month && t.type==='expense'
  }).reduce((s,t)=>s+Math.abs(t.amount),0)
  const refunds = txs.filter(t=>{
    const d = new Date(t.date); return d.getFullYear()===year && d.getMonth()===month && t.type==='refund'
  }).reduce((s,t)=>s+Math.abs(t.amount),0)
  const revenue = sales - expenses - refunds
  return { sales, expenses, refunds, revenue }
}

export function rangeToday(): { from: Date; to: Date } {
  const now = new Date(); return { from: startOfDay(now), to: endOfDay(now) }
}

export function rangeThisWeek(): { from: Date; to: Date } {
  const now = new Date(); return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) }
}

export function rangeThisMonth(): { from: Date; to: Date } {
  const now = new Date()
  return { from: startOfMonth(now), to: endOfMonth(now) }
}

export function rangeLastWeek(): { from: Date; to: Date } {
  const now = new Date();
  const endPrev = new Date(startOfWeek(now, { weekStartsOn: 1 }).getTime() - 1)
  const startPrev = startOfWeek(endPrev, { weekStartsOn: 1 })
  return { from: startPrev, to: endPrev }
}

export function rangeYesterday(): { from: Date; to: Date } {
  const y = addDays(new Date(), -1); return { from: startOfDay(y), to: endOfDay(y) }
}

export function rangeLastMonth(): { from: Date; to: Date } {
  const prev = subMonths(new Date(), 1)
  return { from: startOfMonth(prev), to: endOfMonth(prev) }
}



export function totalsInRange(reports: WeeklyReport[], txs: Transaction[], range: { from: Date; to: Date }) {
  const { from, to } = range
  const inRange = (d: Date) => d >= from && d <= to
  const sales = reports.filter(r => inRange(new Date(r.createdAt))).reduce((s,r)=>s+r.totalSales,0)
  const expenses = txs.filter(t=> inRange(new Date(t.date)) && t.type==='expense').reduce((s,t)=>s+Math.abs(t.amount),0)
  const refunds = txs.filter(t=> inRange(new Date(t.date)) && t.type==='refund').reduce((s,t)=>s+Math.abs(t.amount),0)
  return { sales, expenses, refunds, revenue: sales - expenses - refunds }
}

export function inRange(range: { from: Date; to: Date }, d: Date) {
  return d >= range.from && d <= range.to
}

export function formatRange(range: { from: Date; to: Date }) {
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined })
  return `${fmt(range.from)} - ${fmt(range.to)}`
}

// Returns the date range (within a month) for a given week number (1..5).
// Week 1: days 1-7, Week 2: 8-14, Week 3: 15-21, Week 4: 22-28, Week 5: 29-end.
export function monthWeekRange(year: number, month: number, week: number): { valid: boolean; from?: Date; to?: Date } {
  const lastDay = new Date(year, month + 1, 0).getDate()
  const startDay = (week - 1) * 7 + 1
  if (startDay > lastDay) return { valid: false }
  const endDay = Math.min(startDay + 6, lastDay)
  return { valid: true, from: new Date(year, month, startDay), to: new Date(year, month, endDay) }
}
