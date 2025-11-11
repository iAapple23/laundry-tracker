import ChartCard from '@/components/ChartCard'
import { useStore } from '@/store'
import { computeTotals, yearMonths, rangeThisMonth } from '@/lib/utils'
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useMemo, useState } from 'react'

export default function Dashboard() {
  const reports = useStore(s=>s.reports)
  const txs = useStore(s=>s.transactions)
  const range = rangeThisMonth()
  const year = range.from.getFullYear()
  const { monthly } = computeTotals(reports, txs, year)
  const months = yearMonths(year)
  const [selectedYear, setSelectedYear] = useState(year)
  const yearOptions = useMemo(() => {
    const set = new Set<number>()
    set.add(new Date().getFullYear())
    reports.forEach(r=>set.add(r.year))
    txs.forEach(t=>set.add(new Date(t.date).getFullYear()))
    return Array.from(set).sort((a,b)=>b-a)
  }, [reports, txs])
  const selectedAnnual = useMemo(() => computeTotals(reports, txs, selectedYear), [reports, txs, selectedYear])

  const annualData = months.map((m, i)=>({
    month: m,
    sales: +monthly[i].sales.toFixed(2),
    expenses: +monthly[i].expenses.toFixed(2),
    refunds: +monthly[i].refunds.toFixed(2),
  }))

  const revenueData = months.map((m,i)=>({ month: m, revenue: +monthly[i].revenue.toFixed(2) }))

  const performanceData = months.map((m, i)=>({
    month: m,
    expenses: +monthly[i].expenses.toFixed(2),
    profit: +monthly[i].revenue.toFixed(2),
    revenue: +monthly[i].sales.toFixed(2),
  }))

  const quarterlySales = [0, 0, 0, 0]
  months.forEach((_, idx) => {
    const quarterIndex = Math.floor(idx / 3)
    quarterlySales[quarterIndex] += monthly[idx].sales
  })
  const quarterlyData = ['Q1', 'Q2', 'Q3', 'Q4'].map((label, index) => ({
    quarter: label,
    sales: +quarterlySales[index].toFixed(2),
  }))

  const StyledTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null
    return (
      <div className="bg-white dark:bg-gray-900 border border-black/10 dark:border-white/10 rounded-lg shadow-lg text-xs text-gray-800 dark:text-gray-200 p-3">
        <div className="font-medium mb-2">{label}</div>
        {payload.map((item: { dataKey: string; value: number; color: string; name: string }) => (
          <div key={item.dataKey} className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full" style={{ background: item.color }}></span>
            <span>{item.name}: RM {Number(item.value).toFixed(2)}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-gray-400">Your laundry business at a glance.</p>
        </div>
      </div>
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold">Annual Summary: {selectedYear}</div>
          <select
            value={selectedYear}
            onChange={e=>setSelectedYear(Number(e.target.value))}
            className="bg-white border border-blue-500 text-blue-700 rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            {yearOptions.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="flex items-center gap-3 rounded-xl p-4 bg-white/80 dark:bg-gray-900/60 shadow-sm">
            <span className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center text-emerald-500 text-base font-semibold">$</span>
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Total Revenue</p>
              <p className="text-lg font-semibold">RM {selectedAnnual.totals.sales.toFixed(2)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl p-4 bg-white/80 dark:bg-gray-900/60 shadow-sm">
            <span className="w-10 h-10 rounded-full bg-red-500/20 border border-red-500 flex items-center justify-center text-red-500 text-base font-semibold">&#8595;</span>
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Total Expenses</p>
              <p className="text-lg font-semibold">RM {selectedAnnual.totals.expenses.toFixed(2)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl p-4 bg-white/80 dark:bg-gray-900/60 shadow-sm">
            <span className="w-10 h-10 rounded-full bg-indigo-500/20 border border-indigo-500 flex items-center justify-center text-indigo-500 text-base font-semibold">↗</span>
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Net Profit</p>
              <p className="text-lg font-semibold">RM {selectedAnnual.totals.revenue.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title={`Monthly Summary (${year})`}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={annualData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="month" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip content={<StyledTooltip />} />
              <Legend />
              <Bar dataKey="sales" fill="#10b3a6" name="sales" />
              <Bar dataKey="expenses" fill="#60a5fa" name="expenses" />
              <Bar dataKey="refunds" fill="#f87171" name="refunds" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Monthly Revenue Trends">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="month" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip content={<StyledTooltip />} />
              <Bar dataKey="revenue" fill="#10b3a6" name="revenue" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Monthly Performance">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="month" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" tickFormatter={value => `RM${(value/1000).toFixed(1)}k`} />
              <Tooltip content={<StyledTooltip />} />
              <Legend verticalAlign="bottom" align="center" />
              <Line type="monotone" dataKey="expenses" name="Expenses" stroke="#f87171" dot={{ r: 3 }} strokeWidth={2} />
              <Line type="monotone" dataKey="profit" name="Profit" stroke="#6366f1" dot={{ r: 3 }} strokeWidth={2} />
              <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#10b981" dot={{ r: 3 }} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Quarterly Sales Breakdown">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={quarterlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="quarter" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" tickFormatter={value => `RM${(value/1000).toFixed(1)}k`} />
              <Tooltip content={<StyledTooltip />} formatter={(value:any)=>`RM ${value.toFixed(2)}`} />
              <Legend verticalAlign="bottom" align="center" />
              <Bar dataKey="sales" fill="#10b3a6" name="Sales Revenue" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  )
}
