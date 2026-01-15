import MetricCard from '@/components/MetricCard'
import ChartCard from '@/components/ChartCard'
import Delta from '@/components/Delta'
import DateFilter from '@/components/DateFilter'
import { months, monthlyStats, pctChange, prevMonthYear, totalsInRange, rangeThisMonth, formatRange, monthWeekRange } from '@/lib/utils'
import { useStore } from '@/store'
import { supabase } from '@/lib/supabase'
import { useMemo, useState, useRef } from 'react'
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Label } from 'recharts'
import type { Transaction, WeeklyReport } from '@/types'
import { toast } from '@/components/ToastContainer'

export default function DataEntry() {
  const { addReport, addTransaction, deleteTransaction, reports, transactions } = useStore()
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth())
  const [year, setYear] = useState(now.getFullYear())
  const [week, setWeek] = useState(1)
  const [form, setForm] = useState({
    washer1: '', washer2: '', dryer1: '', dryer2: '', online: '', offline: '', moneyCollected: '', notes: ''
  })
  const [formErr, setFormErr] = useState<{[k:string]: string}>({})
  const [bannerMsg, setBannerMsg] = useState<string>('')
  const [savingWeekly, setSavingWeekly] = useState(false)
  const [savedWeekly, setSavedWeekly] = useState(false)

  // Total Sales reflects Online + Offline only (parse text safely)
  const toNum = (v: any) => (v === '' || v === undefined ? 0 : Number(v) || 0)
  const total = toNum(form.online) + toNum(form.offline)

  const weekOf = (d: Date) => Math.min(5, Math.floor((d.getDate()-1)/7)+1)
  const [tx, setTx] = useState<{ type: 'expense'|'refund'; month: number; year: number; week: number; amount: string; description: string }>(
    { type: 'expense', month: now.getMonth(), year: now.getFullYear(), week: weekOf(now), amount: '', description: '' }
  )
  const [txError, setTxError] = useState<string>("")
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [showMonthTx, setShowMonthTx] = useState<boolean>(true)
  const monthly = useMemo(()=> monthlyStats(reports, transactions, year, month), [reports, transactions, month, year])
  const { offlineGap, offlineTotal, collectedTotal } = useMemo(() => {
    const inMonth = reports.filter(r => r.year === year && r.month === month)
    const offlineTotal = inMonth.reduce((s, r) => s + (r.offline || 0), 0)
    const collectedTotal = inMonth.reduce((s, r) => s + (r.moneyCollected || 0), 0)
    return { offlineGap: offlineTotal - collectedTotal, offlineTotal, collectedTotal }
  }, [reports, year, month])
  const pm = prevMonthYear(year, month)
  const prevMonthly = useMemo(()=> monthlyStats(reports, transactions, pm.year, pm.month), [reports, transactions, pm])
  const deltas = {
    sales: pctChange(monthly.sales, prevMonthly.sales),
    revenue: pctChange(monthly.revenue, prevMonthly.revenue),
    expenses: pctChange(monthly.expenses, prevMonthly.expenses),
    refunds: pctChange(monthly.refunds, prevMonthly.refunds),
  }

  // Daily Sales and Revenue for selected month
  const dailyData = useMemo(() => {
    const start = new Date(year, month, 1)
    const today = new Date()
    const end = year === today.getFullYear() && month === today.getMonth() ? today : new Date(year, month + 1, 0)
    const days = end.getDate()
    const arr: { label: string; sales: number; revenue: number }[] = []
    for (let d = 1; d <= days; d++) arr.push({ label: String(d), sales: 0, revenue: 0 })
    const inMonth = (d: Date) => d.getFullYear() === year && d.getMonth() === month
    for (const r of reports) {
      const d = new Date(r.createdAt); if (!inMonth(d)) continue
      const day = d.getDate(); if (day>=1 && day<=days) arr[day-1].sales += r.totalSales
    }
    const expenses: number[] = Array(days).fill(0)
    const refunds: number[] = Array(days).fill(0)
    for (const t of transactions) {
      const d = new Date(t.date); if (!inMonth(d)) continue
      const day = d.getDate(); if (day<1 || day>days) continue
      if (t.type==='expense') expenses[day-1] += Math.abs(t.amount); else refunds[day-1] += Math.abs(t.amount)
    }
    for (let i=0;i<days;i++) arr[i].revenue = arr[i].sales - expenses[i] - refunds[i]
    return arr
  }, [reports, transactions, year, month])

  // Date range quick buttons like Dashboard
  const [range, setRange] = useState(rangeThisMonth())
  const rTotals = totalsInRange(reports, transactions, range)
  const machineUsageStats = useMemo(() => {
    const usage = { washer1: 0, washer2: 0, dryer1: 0, dryer2: 0 }
    const filteredReports: WeeklyReport[] = []
    for (const rep of reports) {
      const weekRange = monthWeekRange(rep.year, rep.month, rep.week)
      if (!weekRange.valid || !weekRange.from || !weekRange.to) continue
      if (weekRange.from > range.to || weekRange.to < range.from) continue
      filteredReports.push(rep)
      usage.washer1 += rep.washer1 || 0
      usage.washer2 += rep.washer2 || 0
      usage.dryer1 += rep.dryer1 || 0
      usage.dryer2 += rep.dryer2 || 0
    }
    const raw = [
      { name: 'Washer 1', load: usage.washer1 },
      { name: 'Washer 2', load: usage.washer2 },
      { name: 'Dryer 1', load: usage.dryer1 },
      { name: 'Dryer 2', load: usage.dryer2 },
    ]
    const totalLoads = raw.reduce((sum, item) => sum + item.load, 0)
    const machineSales = filteredReports.reduce((sum, r) => sum + (r.totalSales || 0), 0)
    const chartData = raw.map(item => {
      const share = totalLoads === 0 ? 0 : (item.load / totalLoads) * (machineSales || rTotals.sales)
      return {
        ...item,
        value: totalLoads === 0 ? 1 : item.load,
        sales: share,
      }
    })
    return { totalLoads, raw, chartData, machineSales }
  }, [reports, range, rTotals.sales])
  const StyledTooltip = ({ active, payload, label }: { active?: boolean; payload?: any[]; label?: string }) => {
    if (!active || !payload || payload.length === 0) return null
    return (
      <div className="bg-white dark:bg-gray-900 border border-black/10 dark:border-white/10 rounded-lg shadow-lg text-xs text-gray-800 dark:text-gray-200 p-3">
        {label && <div className="font-medium mb-2">{label}</div>}
        {payload.map((item, index) => {
          const value = typeof item.value === 'number'
            ? item.value
            : item.payload?.value ?? 0
          const color = item.color || item.payload?.fill || '#000'
          const name = item.name || item.payload?.name || `Series ${index+1}`
          return (
            <div key={`${item.dataKey ?? name}-${index}`} className="flex items-center gap-2 mb-1">
              <span className="color-dot-dynamic" style={{ '--dot-color': color } as any}></span>
              <span>{name}: RM {Number(value).toFixed(2)}</span>
            </div>
          )
        })}
      </div>
    )
  }
  const { chartData: machineChartData, raw: machineRawUsage, machineSales } = machineUsageStats
  const machineUsageColors = ['#6366f1', '#818cf8', '#34d399', '#fb7185']
  // Tooltip positions for donut charts (locks tooltip just outside the ring)
  const [ooTip, setOoTip] = useState<{ x: number; y: number }|undefined>(undefined)
  const [omTip, setOmTip] = useState<{ x: number; y: number }|undefined>(undefined)
  const ooRef = useRef<HTMLDivElement>(null)
  const omRef = useRef<HTMLDivElement>(null)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Data Entry</h1>
          <p className="text-gray-400">Update weekly reports and log expenses or refunds.</p>
        </div>
        <DateFilter value={range} onChange={(r)=>{ setRange(r); setMonth(r.from.getMonth()); setYear(r.from.getFullYear()); }} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-3 items-start">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <MetricCard title="Sales" value={`RM ${monthly.sales.toFixed(2)}`} subtitle={<Delta value={deltas.sales} />} />
          <MetricCard title="Revenue" value={`RM ${monthly.revenue.toFixed(2)}`} subtitle={<Delta value={deltas.revenue} />} />
          <MetricCard title="Expenses" value={`RM ${monthly.expenses.toFixed(2)}`} subtitle={<Delta value={deltas.expenses} invert />} />
          <MetricCard title="Refunds" value={`RM ${monthly.refunds.toFixed(2)}`} subtitle={<Delta value={deltas.refunds} invert />} />
        </div>
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-lg font-semibold">Summary</div>
            <div className="text-xs text-gray-400">{months[month]} {year}</div>
          </div>
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Total Sales</span>
            <span className="font-medium">RM {monthly.sales.toFixed(2)}</span>
          </div>
          <div className="border-t border-black/10 dark:border-white/10 pt-3 space-y-2">
            <div className="flex items-center justify-between text-sm font-semibold">
              <span>This Month's Expenses/Refunds</span>
              <button className="text-xs text-blue-600 hover:text-blue-700" onClick={()=> setShowMonthTx(v=>!v)}>{showMonthTx ? 'Hide' : 'Show'}</button>
            </div>
            {showMonthTx && (
              <div className="space-y-1">
                {(function(){
                  const list = transactions
                    .filter(t=>{ const d=new Date(t.date); return d.getFullYear()===year && d.getMonth()===month })
                    .sort((a,b)=> +new Date(b.date)-+new Date(a.date))
                  if (list.length===0) return <div className="text-xs text-gray-500">No expenses or refunds yet.</div>
                  return list.map(t=> (
                    <div key={t.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-1 text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wide ${t.type==='expense'?'bg-red-200 text-red-700 dark:bg-red-600/20 dark:text-red-300':'bg-blue-200 text-blue-700 dark:bg-blue-600/20 dark:text-blue-300'}`}>{t.type==='expense'?'Expense':'Refund'}</span>
                        <span className="text-gray-600 dark:text-gray-300 truncate">{t.description || '(no description)'}</span>
                      </div>
                      <span className="font-medium whitespace-nowrap text-right">RM {Number(t.amount).toFixed(2)}</span>
                      <div className="flex items-center gap-1">
                        <button className="btn btn-secondary p-1" aria-label="Edit" title="Edit" onClick={()=> setEditingTx(t)}>
                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M12 20h9"/>
                            <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z"/>
                          </svg>
                        </button>
                        <button className="btn btn-secondary p-1 text-red-600" aria-label="Delete" title="Delete" onClick={()=>{ if (confirm('Delete this record?')) { deleteTransaction(t.id); toast.success('Transaction deleted') } }}>
                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                            <line x1="10" y1="11" x2="10" y2="17"/>
                            <line x1="14" y1="11" x2="14" y2="17"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))
                })()}
              </div>
            )}
          </div>
          <hr className="border-black/5 dark:border-white/10" />
          <div className="space-y-1 text-sm">
            <div className="flex items-center justify-between text-gray-500">
              <span>Refunds</span>
              <span className="text-red-600">- RM {monthly.refunds.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-gray-500">
              <span>Expenses</span>
              <span className="text-red-600">- RM {monthly.expenses.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-gray-500">
              <span>Offline</span>
              <span>RM {offlineTotal.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-gray-500">
              <span>Collected</span>
              <span>RM {collectedTotal.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-gray-500">
              <span>Offline - Collected</span>
              <span className={`${offlineGap > 0 ? 'text-red-600' : 'text-blue-600'}`}>RM {offlineGap.toFixed(2)}</span>
            </div>
          </div>
          <div className="mt-3 border-t border-black/10 dark:border-white/10 pt-3 flex items-center justify-between">
            <span className="font-semibold">Net Revenue</span>
            <span className={`font-semibold ${monthly.revenue >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>
              RM {monthly.revenue.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5 space-y-4">
          <div className="text-lg font-semibold">Weekly Report</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div>
              <label htmlFor="report-month" className="text-xs text-gray-400">Month</label>
              <select id="report-month" className="select" value={month} onChange={e=>setMonth(Number(e.target.value))}>
                {months.map((m,i)=> <option value={i} key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="report-year" className="text-xs text-gray-400">Year</label>
              <select id="report-year" className="select" value={year} onChange={e=>setYear(Number(e.target.value))}>
                {Array.from({length:6},(_,k)=>now.getFullYear()-2+k).map(y=> <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="report-week" className="text-xs text-gray-400">Week</label>
              <select id="report-week" className="select w-auto min-w-[160px]" value={week} onChange={e=>setWeek(Number(e.target.value))}>
                {[1,2,3,4,5].map(w=> {
                  const r = monthWeekRange(year, month, w)
                  const label = r.valid && r.from && r.to
                    ? `Week ${w} (${r.from.toLocaleDateString(undefined,{month:'short', day:'numeric'})} - ${r.to.toLocaleDateString(undefined,{month:'short', day:'numeric'})})`
                    : `Week ${w} (N/A)`
                  return <option key={w} value={w} disabled={!r.valid}>{label}</option>
                })}
              </select>
            </div>
          </div>
          {(() => { const r = monthWeekRange(year, month, week); return r.valid && r.from && r.to ? (
            <div className="text-xs text-gray-600 dark:text-gray-300">Selected range: {r.from.toLocaleDateString()} - {r.to.toLocaleDateString()}</div>
          ) : (
            <div className="text-xs text-red-600 dark:text-red-400">Selected week has no days in this month.</div>
          ) })()}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {([
              ['washer1','Washer 1 Sales (RM)'],
              ['washer2','Washer 2 Sales (RM)'],
              ['dryer1','Dryer 1 Sales (RM)'],
              ['dryer2','Dryer 2 Sales (RM)'],
              ['online','Online Sales (RM)'],
              ['offline','Offline Sales (RM)'],
            ] as const).map(([k,label])=> (
              <div key={k}>
                <label className="text-xs text-gray-400">{label}</label>
                <input title={label} className={`input ${formErr[k] ? 'border-red-500 focus:ring-red-500' : ''}`} type="text" value={(form as any)[k]} onChange={e=>{ const v=e.target.value; setForm(f=>({...f,[k]: v })); if (v.trim()==='' || isFinite(Number(v))) setFormErr(err=>({...err,[k]: ''})); }} />
                {formErr[k] && <div className="mt-1 text-xs text-red-600 dark:text-red-400">{formErr[k]}</div>}
              </div>
            ))}
          </div>
          {/* Money Collected + Sales (computed) + expanded Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400">Money Collected (RM)</label>
              <input title="Money Collected" className="input" type="text" value={form.moneyCollected} onChange={e=> setForm(f=>({...f, moneyCollected: e.target.value}))} />
            </div>
            <div>
              <label className="text-xs text-gray-400">Sales (RM)</label>
              <input title="Sales (auto-calculated)" className="input readonly" readOnly value={Number.isFinite(total) ? total.toFixed(2) : ''} placeholder="Auto" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-gray-400">Notes</label>
              <textarea title="Notes" className="textarea" rows={3} value={form.notes} onChange={e=> setForm(f=>({...f, notes: e.target.value}))} />
            </div>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button className="btn-primary" title="Save weekly report" onClick={async ()=>{
              const fields = ['washer1','washer2','dryer1','dryer2','online','offline'] as const
              const errs: {[k:string]: string} = {}
              for (const k of fields) {
                const v = (form as any)[k]
                if (v !== '' && !isFinite(Number(v))) errs[k] = 'Enter a valid number'
              }
              setFormErr(errs)
              if (Object.keys(errs).length>0) { setBannerMsg('Please fix the highlighted fields.'); return }
              setSavingWeekly(true)
              try {
                const newReport = {
                  year, month, week: week as any,
                  washer1: Number(form.washer1)||0,
                  washer2: Number(form.washer2)||0,
                  dryer1: Number(form.dryer1)||0,
                  dryer2: Number(form.dryer2)||0,
                  online: Number(form.online)||0,
                  offline: Number(form.offline)||0,
                  moneyCollected: Number(form.moneyCollected)||0,
                  notes: form.notes||undefined,
                }
                // Add to local store
                addReport(newReport)
                // Persist to Supabase
                const report = useStore.getState().reports.find(r => 
                  r.year === year && r.month === month && r.week === week
                )
                if (report) {
                  const weekRange = monthWeekRange(year, month, week)
                  const { error } = await supabase.from('weekly_reports').insert([{
                    year: report.year,
                    month: report.month,
                    week_start: weekRange.from?.toISOString().split('T')[0],
                    week_end: weekRange.to?.toISOString().split('T')[0],
                    washer1_sales: report.washer1,
                    washer2_sales: report.washer2,
                    dryer1_sales: report.dryer1,
                    dryer2_sales: report.dryer2,
                    online_sales: report.online,
                    offline_sales: report.offline,
                    money_collected: report.moneyCollected,
                    total_sales: report.totalSales,
                    notes: report.notes,
                  }])
                  if (error) throw error
                }
                setSavedWeekly(true)
                setForm({ washer1:'', washer2:'', dryer1:'', dryer2:'', online:'', offline:'', moneyCollected:'', notes:'' })
                toast.success('Weekly report saved')
              } catch (err: any) {
                console.error('Save error:', err)
                console.error('Error details:', err?.message, err?.code, err?.details)
                toast.error(err?.message || 'Failed to save report')
              } finally {
                setSavingWeekly(false)
              }
            }}>Save Weekly Report</button>
            {/* Removed transient "Saved." label for cleaner UI */}
          </div>
        </div>
        <div className="card p-5 space-y-3">
          <div className="text-lg font-semibold">Add Expense/Refund</div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs text-gray-400">Transaction Type</label>
              <div className="bg-black/5 dark:bg-white/10 rounded-full p-1 inline-flex w-full">
                <button
                  type="button"
                  title="Select Expense"
                  className={`flex-1 rounded-full px-4 py-2 text-sm transition-colors ${tx.type==='expense' ? 'bg-white text-brand border border-black/10 dark:bg-gray-900 dark:border-white/10' : 'text-gray-600 dark:text-gray-300'}`}
                  onClick={()=> setTx(t=>({...t, type:'expense'}))}
                >Expense</button>
                <button
                  type="button"
                  title="Select Refund"
                  className={`flex-1 rounded-full px-4 py-2 text-sm transition-colors ${tx.type==='refund' ? 'bg-white text-brand border border-black/10 dark:bg-gray-900 dark:border-white/10' : 'text-gray-600 dark:text-gray-300'}`}
                  onClick={()=> setTx(t=>({...t, type:'refund'}))}
                >Refund</button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-gray-400">Amount (RM)</label>
              <div className="flex">
                <span aria-hidden="true" className="inline-flex items-center px-3 rounded-l-md border border-black/5 bg-gray-100 text-gray-400 dark:bg-gray-800/30 dark:border-white/5 dark:text-gray-400">RM</span>
                <input
                  className="input rounded-l-none border-l-0"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={tx.amount}
                  onChange={e=> { const v = e.target.value.replace(/[^0-9.]/g,''); setTx(t=>({...t, amount: v})) }}
                />
              </div>
            </div>


            <div className="lg:col-span-2">
              <label className="text-xs text-gray-400">Date</label>
              <div className="grid grid-cols-3 gap-3 mt-1">
                <select className="select" title="Select month" value={tx.month} onChange={e=> setTx(t=>({...t, month: Number(e.target.value)}))}>
                  {months.map((m,i)=> <option key={m} value={i}>{m}</option>)}
                </select>
                <select className="select" title="Select year" value={tx.year} onChange={e=> setTx(t=>({...t, year: Number(e.target.value)}))}>
                  {Array.from({length:6},(_,k)=>now.getFullYear()-2+k).map(y=> <option key={y} value={y}>{y}</option>)}
                </select>
                <select className="select" title="Select week" value={tx.week} onChange={e=> setTx(t=>({...t, week: Number(e.target.value)}))}>
                  {[1,2,3,4,5].map(w=> {
                    const r = monthWeekRange(tx.year, tx.month, w)
                    const label = r.valid && r.from && r.to ? `Week ${w} (${r.from.getDate()} - ${r.to.getDate()})` : `Week ${w} (N/A)`
                    return <option key={w} value={w} disabled={!r.valid}>{label}</option>
                  })}
                </select>
              </div>
              {/* Intentionally removed helper text for final record date */}
            </div>
            <div className="lg:col-span-2">
              <label className="text-xs text-gray-400">Description</label>
              <textarea className="textarea" rows={3} placeholder="What is this for?" value={tx.description} onChange={e=> setTx(t=>({...t, description: e.target.value}))} />
            </div>
          </div>
          {txError && <div className="text-xs text-red-600 dark:text-red-400">{txError}</div>}
          <div className="flex items-center justify-end gap-3">
            <button className="btn-secondary" onClick={()=>{ setTx({ type:'expense', month: now.getMonth(), year: now.getFullYear(), week: Math.min(5, Math.floor((now.getDate()-1)/7)+1), amount:'', description:'' }); setTxError('') }}>Clear</button>
            <button className="btn-primary" onClick={async ()=>{
              const amt = Number(tx.amount)
              if (!isFinite(amt) || amt<=0) { setTxError('Enter a valid positive amount'); return }
              setTxError('')
              const r = monthWeekRange(tx.year, tx.month, tx.week)
              const date = (r.valid && r.to) ? r.to : new Date(tx.year, tx.month, 1)
              try {
                const newTx = {
                  type: tx.type,
                  amount: -Math.abs(amt),
                  description: tx.description || undefined,
                  date: new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString(),
                }
                // Add to local store
                addTransaction(newTx)
                // Persist to Supabase - get the created transaction from store
                const transaction = useStore.getState().transactions.find(t => 
                  t.date === newTx.date && t.amount === newTx.amount && t.type === newTx.type
                )
                if (transaction) {
                  const { error } = await supabase.from('transactions').insert([{
                    type: transaction.type,
                    amount: transaction.amount,
                    year: tx.year,
                    month: tx.month,
                    week: tx.week,
                    description: transaction.description,
                  }])
                  if (error) throw error
                }
                setTx(t=>({...t, amount:'', description:''}))
                toast.success(`${tx.type==='expense'?'Expense':'Refund'} added`)
              } catch (err: any) {
                console.error('Save error:', err)
                console.error('Error details:', err?.message, err?.code, err?.details)
                toast.error(err?.message || 'Failed to add transaction')
              }
            }}>Add {tx.type==='expense'?'Expense':'Refund'}</button>
          </div>
        </div>
        {editingTx && (
          <TxEditModal tx={editingTx} onClose={()=> setEditingTx(null)} onSave={(newTx)=>{ useStore.getState().updateTransaction(newTx); setEditingTx(null); toast.success('Transaction updated') }} />
        )}
        <ChartCard title="Online vs Offline Sales" note={`${months[month]} ${year}`}>
          <div className="relative h-full" ref={ooRef}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart onMouseMove={(e:any)=>{ if (!ooRef.current || !e) { setOoTip(undefined); return } const w=ooRef.current.clientWidth; const h=ooRef.current.clientHeight; const cx=w/2; const cy=h/2; const x=(e.chartX||cx); const y=(e.chartY||cy); const dx=x-cx; const dy=y-cy; const len=Math.sqrt(dx*dx+dy*dy)||1; const ux=dx/len; const uy=dy/len; const r=112; setOoTip({ x: Math.round(cx+ux*r), y: Math.round(cy+uy*r) }); }} onMouseLeave={()=> setOoTip(undefined)}>
                <defs>
                  <linearGradient id="oo-online" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#818cf8"/>
                    <stop offset="100%" stopColor="#6366f1"/>
                  </linearGradient>
                  <linearGradient id="oo-offline" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#93c5fd"/>
                    <stop offset="100%" stopColor="#3b82f6"/>
                  </linearGradient>
                </defs>
                <Tooltip position={ooTip} wrapperStyle={{ outline: "none" }}
                         labelFormatter={() => ''}
                         content={<StyledTooltip />} />
                <Pie dataKey="value" innerRadius={70} outerRadius={100} cornerRadius={6} data={(function(){
                  const mReports = reports.filter(r=> r.year===year && r.month===month)
                  const online = mReports.reduce((s,r)=> s + (r.online||0), 0)
                  const offline = mReports.reduce((s,r)=> s + (r.offline||0), 0)
                  return [
                    { name: 'Online',  value: Number(online.toFixed(2)), fill: 'url(#oo-online)' },
                    { name: 'Offline', value: Number(offline.toFixed(2)), fill: 'url(#oo-offline)' },
                  ]
                })()}>
                  <Cell stroke="#ffffff" strokeWidth={2} />
                  <Cell stroke="#ffffff" strokeWidth={2} />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            {(() => {
              const mReports = reports.filter(r=> r.year===year && r.month===month)
              const online = mReports.reduce((s,r)=> s + (r.online||0), 0)
              const offline = mReports.reduce((s,r)=> s + (r.offline||0), 0)
              const total = online + offline
              return (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-center">
                  <div>
                    <div className="text-xl font-semibold">RM {total.toFixed(2)}</div>
                    <div className="text-xs text-gray-500 mt-1">Online vs Offline</div>
                  </div>
                </div>
              )
            })()}
          </div>
          {(() => {
            const mReports = reports.filter(r=> r.year===year && r.month===month)
            const online = mReports.reduce((s,r)=> s + (r.online||0), 0)
            const offline = mReports.reduce((s,r)=> s + (r.offline||0), 0)
            return (
              <div className="mt-2 mb-8 text-xs text-gray-600 dark:text-gray-300 flex items-center justify-center gap-3">
                <span className="inline-flex items-center gap-1"><span className="color-dot-tooltip color-dot-indigo"></span> Online: {online.toFixed(2)}</span>
                <span className="opacity-60">|</span>
                <span className="inline-flex items-center gap-1"><span className="color-dot-tooltip color-dot-blue"></span> Offline: {offline.toFixed(2)}</span>
              </div>
            )
          })()}
        </ChartCard>

        <ChartCard title="Offline Sales vs Money Collected" note={`${months[month]} ${year}`}>
          <div className="relative h-full" ref={omRef}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart onMouseMove={(e:any)=>{ if (!omRef.current || !e) { setOmTip(undefined); return } const w=omRef.current.clientWidth; const h=omRef.current.clientHeight; const cx=w/2; const cy=h/2; const x=(e.chartX||cx); const y=(e.chartY||cy); const dx=x-cx; const dy=y-cy; const len=Math.sqrt(dx*dx+dy*dy)||1; const ux=dx/len; const uy=dy/len; const r=112; setOmTip({ x: Math.round(cx+ux*r), y: Math.round(cy+uy*r) }); }} onMouseLeave={()=> setOmTip(undefined)}>
                <defs>
                  <linearGradient id="om-offline" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#93c5fd"/>
                    <stop offset="100%" stopColor="#60a5fa"/>
                  </linearGradient>
                  <linearGradient id="om-collected" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34d399"/>
                    <stop offset="100%" stopColor="#10b981"/>
                  </linearGradient>
                </defs>
                <Tooltip position={omTip} wrapperStyle={{ outline: "none" }}
                          labelFormatter={() => ''}
                          content={<StyledTooltip />} />
                <Pie dataKey="value" innerRadius={70} outerRadius={100} cornerRadius={6} paddingAngle={2}
                     data={[{ name: 'Offline', value: Number(offlineTotal.toFixed(2)), fill: 'url(#om-offline)' }, { name: 'Collected', value: Number(collectedTotal.toFixed(2)), fill: 'url(#om-collected)' }]}>
                  <Cell stroke="#ffffff" strokeWidth={2} />
                  <Cell stroke="#ffffff" strokeWidth={2} />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-center"> 
              <div> 
                <div className="text-xl font-semibold">RM {(offlineTotal+collectedTotal).toFixed(2)}</div>
                <div className="text-xs text-gray-500 mt-1">Offline vs Collected</div>
              </div>
            </div>
          </div>
          <div className="mt-2 mb-8 text-xs text-gray-600 dark:text-gray-300 flex items-center justify-center gap-3">
            <span className="inline-flex items-center gap-1"><span className="color-dot-tooltip color-dot-light-blue"></span> Offline: {offlineTotal.toFixed(2)}</span>
            <span className="opacity-60">|</span>
            <span className="inline-flex items-center gap-1"><span className="color-dot-tooltip color-dot-emerald"></span> Collected: {collectedTotal.toFixed(2)}</span>
          </div>
        </ChartCard>

        <ChartCard title="Machine Usage" note={formatRange(range)}>
          <div className="relative h-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip content={<StyledTooltip />} />
                <Pie
                  dataKey="value"
                  data={machineChartData}
                  innerRadius={70}
                  outerRadius={96}
                  cornerRadius={24}
                  paddingAngle={0}>
                  {machineChartData.map((entry, index) => (
                    <Cell key={entry.name} fill={machineUsageColors[index % machineUsageColors.length]} stroke="#ffffff" strokeWidth={2} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <div className="text-xl font-semibold">{`RM ${machineSales.toFixed(2)}`}</div>
                <div className="text-xs leading-tight text-gray-600 mt-1">{`RM ${monthly.revenue.toFixed(2)} Revenue`}</div>
              </div>
            </div>
          </div>
          <div className="mt-2 mb-8 text-xs text-gray-600 dark:text-gray-300 flex items-center justify-center gap-3 flex-wrap">
            {machineRawUsage.map((item, index) => (
              <span key={item.name} className="inline-flex items-center gap-1">
                <span className="color-dot-dynamic" style={{ '--dot-color': machineUsageColors[index % machineUsageColors.length] } as any}></span>
                {item.name}: {item.load}
              </span>
            ))}
          </div>
        </ChartCard>


        <ChartCard title="Monthly Sales Trend" note={`${months[month]} ${year}`}>
          <div className="h-56 px-3 pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={(function(){
              const data: { label: string; revenue: number }[] = []
              for (let w=1; w<=5; w++) {
                const r = monthWeekRange(year, month, w)
                if (!r.valid || !r.from || !r.to) continue
                let sales = 0, exp = 0, ref = 0
                // Use the report's selected week within the selected month
                for (const rep of reports) {
                  if (rep.year === year && rep.month === month && rep.week === (w as any)) {
                    sales += rep.totalSales
                  }
                }
                for (const t of transactions) {
                  const d = new Date(t.date)
                  if (d < r.from || d > r.to) continue
                  const amt = Math.abs(t.amount)
                  if (t.type==='expense') exp += amt; else ref += amt
                }
                data.push({ label: `Week ${w}`, revenue: +(sales - exp - ref).toFixed(2) })
              }
              return data
            })()} margin={{ top: 10, right: 0, left: 20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="label" stroke="#9ca3af" tick={{ fontSize: 12 }} />
              <YAxis stroke="#9ca3af" domain={[0,'auto']} tickFormatter={v=> typeof v === 'number' ? String(v) : `${v}`} tickMargin={10}>
                <Label value="RM" position="insideTopLeft" offset={-15} dx={-4} fill="#9ca3af" fontSize={12} />
              </YAxis>
                <Tooltip content={<StyledTooltip />} />
              <Line type="monotone" dataKey="revenue" name="Sales Revenue" stroke="#10b981" strokeWidth={2} dot />
              <Legend verticalAlign="bottom" align="center" />
            </LineChart>
          </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>
    </div>
  )
}

function TxEditModal({ tx, onClose, onSave }: { tx: Transaction, onClose: ()=>void, onSave: (t: Transaction)=>void }) {
  const [form, setForm] = useState<Transaction>({...tx})
  const [amtStr, setAmtStr] = useState<string>(String(tx.amount))
  const [amtErr, setAmtErr] = useState<string>('')
  const d0 = new Date(tx.date)
  const weekOf = (d: Date) => Math.min(5, Math.floor((d.getDate()-1)/7)+1)
  const [tMonth, setTMonth] = useState<number>(d0.getMonth())
  const [tYear, setTYear] = useState<number>(d0.getFullYear())
  const [tWeek, setTWeek] = useState<number>(weekOf(d0))
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose}></div>
      <div className="relative z-50 w-[640px] max-w-[95vw] rounded-xl bg-white border border-black/10 shadow-card dark:bg-gray-900 dark:border-white/10 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="text-lg font-semibold">Edit Transaction</div>
          <button type="button" title="Close" className="btn bg-black/10 text-gray-700 border border-black/10 hover:bg-black/20 dark:bg-white/10 dark:text-gray-200 dark:border-white/10" onClick={onClose}>×</button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex gap-2 sm:col-span-2">
            <button type="button" title="Mark as expense" className={`btn flex-1 ${form.type==='expense'?'bg-brand text-white':'bg-black/10 text-gray-700 dark:bg-gray-800 dark:text-gray-100'}`} onClick={()=> setForm(f=>({...f, type:'expense'}))}>Expense</button>
            <button type="button" title="Mark as refund" className={`btn flex-1 ${form.type==='refund'?'bg-brand text-white':'bg-black/10 text-gray-700 dark:bg-gray-800 dark:text-gray-100'}`} onClick={()=> setForm(f=>({...f, type:'refund'}))}>Refund</button>
          </div>
          <div>
            <label htmlFor="edit-tx-month" className="text-xs text-gray-400">Month</label>
            <select id="edit-tx-month" title="Select month" className="select" value={tMonth} onChange={e=> setTMonth(Number(e.target.value))}>
              {months.map((m,i)=> <option key={m} value={i}>{m}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="edit-tx-year" className="text-xs text-gray-400">Year</label>
            <select id="edit-tx-year" title="Select year" className="select" value={tYear} onChange={e=> setTYear(Number(e.target.value))}>
              {Array.from({length:6},(_,k)=>new Date().getFullYear()-2+k).map(y=> <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="edit-tx-week" className="text-xs text-gray-400">Week</label>
            <select id="edit-tx-week" title="Select week" className="select w-full" value={tWeek} onChange={e=> setTWeek(Number(e.target.value))}>
              {[1,2,3,4,5].map(w=>{
                const r = monthWeekRange(tYear, tMonth, w)
                const label = r.valid && r.from && r.to
                  ? `Week ${w} (${r.from.toLocaleDateString(undefined,{month:'short', day:'numeric'})} - ${r.to.toLocaleDateString(undefined,{month:'short', day:'numeric'})})`
                  : `Week ${w} (N/A)`
                return <option key={w} value={w} disabled={!r.valid}>{label}</option>
              })}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="edit-tx-amount" className="text-xs text-gray-400">Amount (RM)</label>
            <input id="edit-tx-amount" title="Amount" className={`input ${amtErr ? 'border-red-500 focus:ring-red-500' : ''}`} type="text" value={amtStr} onChange={e=>{ const v=e.target.value; setAmtStr(v); if (v.trim()==='' || isFinite(Number(v))) setAmtErr('') }} />
            {amtErr && <div className="mt-1 text-xs text-red-600 dark:text-red-400">{amtErr}</div>}
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="edit-tx-desc" className="text-xs text-gray-400">Description</label>
            <textarea id="edit-tx-desc" title="Description" className="textarea" rows={3} value={form.description||''} onChange={e=> setForm(f=>({...f, description: e.target.value }))} />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={()=> { 
            if (amtStr.trim()==='' || !isFinite(Number(amtStr))) { setAmtErr('Amount must be a number'); return }
            const rng = monthWeekRange(tYear, tMonth, tWeek)
            if (!rng.valid || !rng.from) { toast.error('Selected week is not valid for chosen month.'); return }
            const n = Number(amtStr)
            onSave({ ...form, date: rng.from.toISOString().slice(0,10), amount: n })
          }}>Save</button>
        </div>
      </div>
    </div>
  )
}












