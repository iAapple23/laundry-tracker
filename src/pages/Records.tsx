import { useMemo, useState, useEffect } from 'react'
import { useStore } from '@/store'
import { formatCurrency } from '@/lib/utils'
import { WeeklyReport, Transaction } from '@/types'
import ImportExport from '@/components/ImportExport'
import { months, monthWeekRange } from '@/lib/utils'
import { toast } from '@/components/ToastContainer'

type Row = { id: string; date: string; month: number; year: number; type: string; week?: number; description?: string; amount: number; source: 'report'|'tx' }

export default function Records() {
  const { reports, transactions, deleteReport, deleteTransaction, updateReport, updateTransaction } = useStore()
  const rows: Row[] = useMemo(()=>{
    const a: Row[] = reports.map(r=>{
      // Use the report's selected month/year (not createdAt) for display/sorting
      return { id:r.id, date: r.createdAt, month: r.month, year: r.year, type:'Weekly Report', week: r.week, description: r.notes, amount: r.totalSales, source:'report' as const }
    })
    const b: Row[] = transactions.map(t=>{
      const d = new Date(t.date)
      return { id:t.id, date: t.date, month: d.getMonth(), year: d.getFullYear(), type: t.type==='expense'?'Expenses':'Refund', week: undefined, description: t.description, amount: t.amount, source:'tx' as const }
    })
    return [...a, ...b].sort((x,y)=>+new Date(y.date)-+new Date(x.date))
  },[reports, transactions])
  const [filter, setFilter] = useState('')
  const filtered = rows.filter(r => {
    const q = filter.trim().toLowerCase()
    if (!q) return true
    const monthName = months[r.month].toLowerCase()
    const yearStr = String(r.year)
    const typeStr = r.type.toLowerCase()
    const descStr = (r.description || '').toLowerCase()
    return (
      monthName.includes(q) ||
      yearStr.includes(q) ||
      typeStr.includes(q) ||
      descStr.includes(q)
    )
  })

  // Pagination
  const pageSize = 10
  const [page, setPage] = useState(0)
  const pageCount = Math.ceil(filtered.length / pageSize)
  // Sorting
  const [sort, setSort] = useState<{ key: 'month'|'year'|'amount', dir: 'asc'|'desc' }>({ key: 'year', dir: 'desc' })
  const sorted = [...filtered].sort((a,b)=>{
    const dir = sort.dir === 'asc' ? 1 : -1
    switch (sort.key) {
      case 'amount': return (a.amount - b.amount) * dir
      case 'month': return (a.month - b.month) * dir
      case 'year':
      default:
        return (a.year - b.year) * dir
    }
  })
  const pageData = sorted.slice(page * pageSize, page * pageSize + pageSize)

  const [editing, setEditing] = useState<Row | null>(null)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)

  // Close action menu on outside click or Escape
  useEffect(() => {
    const onDocClick = () => setMenuOpen(null)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(null) }
    window.addEventListener('click', onDocClick)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('click', onDocClick)
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Records</h1>
        <p className="text-gray-400">View, edit, or delete your past records.</p>
      </div>
      <div className="card p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <input className="input max-w-lg" placeholder="Filter records (month/year/type/description)..." value={filter} onChange={e=>{ setFilter(e.target.value); setPage(0) }} />
          <ImportExport />
        </div>
        <table className="table">
          <thead>
            <tr>
              <th className="text-left">
                <div className="inline-flex items-center gap-1 select-none cursor-pointer text-gray-600 dark:text-gray-300 px-2 py-1 rounded hover:bg-brand/20 dark:hover:bg-brand/30" onClick={()=> setSort(s=> ({ key:'month', dir: s.key==='month' && s.dir==='desc' ? 'asc' : 'desc' }))}>
                  <span>Month</span>
                  <span className="text-xs opacity-70">{sort.key==='month' ? (sort.dir==='asc'?'↑':'↓') : '↕'}</span>
                </div>
              </th>
              <th className="text-left">
                <div className="inline-flex items-center gap-1 select-none cursor-pointer text-gray-600 dark:text-gray-300 px-2 py-1 rounded hover:bg-brand/20 dark:hover:bg-brand/30" onClick={()=> setSort(s=> ({ key:'year', dir: s.key==='year' && s.dir==='desc' ? 'asc' : 'desc' }))}>
                  <span>Year</span>
                  <span className="text-xs opacity-70">{sort.key==='year' ? (sort.dir==='asc'?'↑':'↓') : '↕'}</span>
                </div>
              </th>
              <th>Type</th>
              <th>Week</th>
              <th>Description</th>
              <th className="text-right">
                <div className="inline-flex items-center gap-1 select-none cursor-pointer text-gray-600 dark:text-gray-300 px-2 py-1 rounded hover:bg-brand/20 dark:hover:bg-brand/30" onClick={()=> setSort(s=> ({ key:'amount', dir: s.key==='amount' && s.dir==='desc' ? 'asc' : 'desc' }))}>
                  <span>Amount</span>
                  <span className="text-xs opacity-70">{sort.key==='amount' ? (sort.dir==='asc'?'↑':'↓') : '↕'}</span>
                </div>
              </th>
              <th className="w-36 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageData.map(r => (
              <tr key={r.id} className="">
                <td>{months[r.month]}</td>
                <td>{r.year}</td>
                <td>{r.type}</td>
                <td>{r.week ? (()=>{ const rng = monthWeekRange(r.year, r.month, r.week!); return rng.valid && rng.from && rng.to ? `Week ${r.week} (${rng.from.toLocaleDateString(undefined,{month:'short', day:'numeric'})} - ${rng.to.toLocaleDateString(undefined,{month:'short', day:'numeric'})})` : `Week ${r.week}` })() : '-'}</td>
                <td className="truncate max-w-[480px]">{r.description}</td>
                <td className={`text-right ${r.amount < 0 ? 'text-red-600 dark:text-red-400' : ''}`}>{formatCurrency(r.amount)}</td>
                <td className="text-right">
                  <div className="relative inline-block text-left" onClick={(e)=> e.stopPropagation()}>
                    <button className="btn bg-black/10 text-gray-700 border border-black/10 hover:bg-black/20 dark:bg-white/10 dark:text-gray-200 dark:border-white/10" onClick={(e)=>{ e.stopPropagation(); setMenuOpen(id => id===r.id ? null : r.id) }}>⋯</button>
                    {menuOpen===r.id && (
                      <div className="absolute right-0 mt-2 w-36 rounded-md bg-white border border-black/10 shadow-card dark:bg-gray-900 dark:border-white/10 z-10" onClick={(e)=> e.stopPropagation()}>
                        <button className="w-full text-left px-3 py-2 hover:bg-black/5 dark:hover:bg-white/10" onClick={()=>{ setEditing(r); setMenuOpen(null) }}>Edit</button>
                        <button className="w-full text-left px-3 py-2 text-red-600 hover:bg-black/5 dark:hover:bg-white/10" onClick={()=>{ 
                          setMenuOpen(null);
                          const label = r.type;
                          if (window.confirm(`Delete this ${label}? This action cannot be undone.`)) {
                            if (r.source==='report') { deleteReport(r.id); toast.success('Record deleted') }
                            else { deleteTransaction(r.id); toast.success('Record deleted') }
                          }
                        }}>Delete</button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length===0 && (
              <tr><td colSpan={7} className="text-center text-gray-400 py-10">No records yet</td></tr>
            )}
          </tbody>
        </table>
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn btn-secondary" disabled={page===0} onClick={()=> setPage(p=>Math.max(0, p-1))}>Previous</button>
          <button className="btn btn-secondary" disabled={page >= pageCount-1 || pageCount===0} onClick={()=> setPage(p=>Math.min(pageCount-1, p+1))}>Next</button>
        </div>
        {editing && (
          <EditModal row={editing} onClose={()=> setEditing(null)} onSave={(updated)=>{
            if (editing.source==='report') { updateReport(updated as any); toast.success('Weekly report updated') }
            else { updateTransaction(updated as any); toast.success('Transaction updated') }
            setEditing(null)
          }} />
        )}
      </div>
    </div>
  )
}

function EditModal({ row, onClose, onSave }: { row: Row, onClose: ()=>void, onSave: (updated: WeeklyReport|Transaction)=>void }) {
  const { reports, transactions } = useStore()
  if (row.source==='report') {
    const orig = reports.find(r=>r.id===row.id) as WeeklyReport
    const [form, setForm] = useState<WeeklyReport>({...orig})
    const [vals, setVals] = useState<{[k:string]: string}>({
      washer1: String(orig.washer1), washer2: String(orig.washer2),
      dryer1: String(orig.dryer1), dryer2: String(orig.dryer2),
      online: String(orig.online), offline: String(orig.offline),
      moneyCollected: String(orig.moneyCollected)
    })
    const [errs, setErrs] = useState<{[k:string]: string}>({})
    return (
      <Modal title="Edit Weekly Report" onClose={onClose}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          <select className="select" value={form.month} onChange={e=> setForm(f=>({...f, month: Number(e.target.value)}))}>
            {months.map((m,i)=> <option key={m} value={i}>{m}</option>)}
          </select>
          <input className="input" type="number" value={form.year} onChange={e=> setForm(f=>({...f, year: Number(e.target.value)}))} />
          <select className="select" value={form.week} onChange={e=> setForm(f=>({...f, week: Number(e.target.value) as any}))}>
            {[1,2,3,4,5].map(w=> {
              const r = monthWeekRange(form.year, form.month, w)
              const label = r.valid && r.from && r.to
                ? `Week ${w} (${r.from.toLocaleDateString(undefined,{month:'short', day:'numeric'})} - ${r.to.toLocaleDateString(undefined,{month:'short', day:'numeric'})})`
                : `Week ${w} (N/A)`
              return <option key={w} value={w} disabled={!r.valid}>{label}</option>
            })}
          </select>
        </div>
        {(() => { const r = monthWeekRange(form.year, form.month, form.week); return r.valid && r.from && r.to ? (
          <div className="text-xs text-gray-600 dark:text-gray-300 mb-3">Selected range: {r.from.toLocaleDateString()} - {r.to.toLocaleDateString()}</div>
        ) : null })()}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {([
            ['washer1','Washer 1 Sales (RM)'],
            ['washer2','Washer 2 Sales (RM)'],
            ['dryer1','Dryer 1 Sales (RM)'],
            ['dryer2','Dryer 2 Sales (RM)'],
            ['online','Online Sales (RM)'],
            ['offline','Offline Sales (RM)'],
            ['moneyCollected','Money Collected (RM)'],
          ] as const).map(([k,label])=> (
            <div key={k}>
              <label className="text-xs text-gray-400">{label}</label>
              <input className={`input ${errs[k] ? 'border-red-500 focus:ring-red-500' : ''}`} type="text" value={vals[k]}
                onChange={e=>{ const v=e.target.value; setVals(s=>({...s,[k]:v})); if (v.trim()==='' || isFinite(Number(v))) setErrs(er=>({...er,[k]:''})) }} />
              {errs[k] && <div className="mt-1 text-xs text-red-600 dark:text-red-400">{errs[k]}</div>}
            </div>
          ))}
          <div>
            <label className="text-xs text-gray-400">Sales (RM)</label>
            <input
              className="input readonly"
              readOnly
              value={(vals.online!=='' || vals.offline!=='') ? (Number(vals.online||0) + Number(vals.offline||0)).toFixed(2) : ''}
              placeholder="Auto" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-gray-400">Notes</label>
            <textarea className="textarea" rows={3} value={form.notes||''} onChange={e=> setForm(f=>({...f, notes: e.target.value }))} />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={()=> {
            const keys = ['washer1','washer2','dryer1','dryer2','online','offline','moneyCollected']
            const nextErr: {[k:string]: string} = {}
            keys.forEach((k)=>{ const v = vals[k]; if (v!=='' && !isFinite(Number(v))) nextErr[k] = 'Must be a number' })
            setErrs(nextErr)
            if (Object.keys(nextErr).length>0) return
            const num = (k:string)=> (vals[k]===''?0:Number(vals[k]))
            onSave({ ...form,
              washer1: num('washer1'), washer2: num('washer2'),
              dryer1: num('dryer1'), dryer2: num('dryer2'),
              online: num('online'), offline: num('offline'),
              moneyCollected: num('moneyCollected'),
              totalSales: num('online') + num('offline')
            })
          }}>Save</button>
        </div>
      </Modal>
    )
  } else {
    const orig = transactions.find(t=>t.id===row.id) as Transaction
    const [form, setForm] = useState<Transaction>({...orig})
    const [amtStr, setAmtStr] = useState<string>(String(orig.amount))
    const [amtErr, setAmtErr] = useState<string>('')
    const d0 = new Date(orig.date)
    const weekOf = (d: Date) => Math.min(5, Math.floor((d.getDate()-1)/7)+1)
    const [tMonth, setTMonth] = useState<number>(d0.getMonth())
    const [tYear, setTYear] = useState<number>(d0.getFullYear())
    const [tWeek, setTWeek] = useState<number>(weekOf(d0))
    return (
      <Modal title="Edit Transaction" onClose={onClose}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex gap-2 sm:col-span-2">
            <button className={`btn flex-1 ${form.type==='expense'?'bg-brand text-white':'bg-black/10 text-gray-700 dark:bg-gray-800 dark:text-gray-100'}`} onClick={()=> setForm(f=>({...f, type:'expense'}))}>Expense</button>
            <button className={`btn flex-1 ${form.type==='refund'?'bg-brand text-white':'bg-black/10 text-gray-700 dark:bg-gray-800 dark:text-gray-100'}`} onClick={()=> setForm(f=>({...f, type:'refund'}))}>Refund</button>
          </div>
          <div>
            <label className="text-xs text-gray-400">Month</label>
            <select className="select" value={tMonth} onChange={e=> setTMonth(Number(e.target.value))}>
              {months.map((m,i)=> <option key={m} value={i}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400">Year</label>
            <select className="select" value={tYear} onChange={e=> setTYear(Number(e.target.value))}>
              {Array.from({length:6},(_,k)=>new Date().getFullYear()-2+k).map(y=> <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-gray-400">Week</label>
            <select className="select w-full" value={tWeek} onChange={e=> setTWeek(Number(e.target.value))}>
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
            <label className="text-xs text-gray-400">Amount (RM)</label>
            <input className={`input ${amtErr ? 'border-red-500 focus:ring-red-500' : ''}`} type="text" value={amtStr} onChange={e=>{ const v=e.target.value; setAmtStr(v); if (v.trim()==='' || isFinite(Number(v))) setAmtErr('') }} />
            {amtErr && <div className="mt-1 text-xs text-red-600 dark:text-red-400">{amtErr}</div>}
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-gray-400">Description</label>
            <textarea className="textarea" rows={3} value={form.description||''} onChange={e=> setForm(f=>({...f, description: e.target.value }))} />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={()=> { 
            if (amtStr.trim()==='' || !isFinite(Number(amtStr))) { setAmtErr('Amount must be a number'); return }
            const rng = monthWeekRange(tYear, tMonth, tWeek)
            if (!rng.valid || !rng.from) { toast.error('Selected week is not valid for chosen month.'); return }
            const n = -Math.abs(Number(amtStr))
            onSave({ ...form, date: rng.from.toISOString().slice(0,10), amount: n }) 
          }}>Save</button>
        </div>
      </Modal>
    )
  }
}

function Modal({ title, children, onClose }: { title: string, children: any, onClose: ()=>void }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose}></div>
      <div className="relative z-50 w-[680px] max-w-[95vw] rounded-xl bg-white border border-black/10 shadow-card dark:bg-gray-900 dark:border-white/10 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="text-lg font-semibold">{title}</div>
          <button className="btn bg-black/10 text-gray-700 border border-black/10 hover:bg-black/20 dark:bg-white/10 dark:text-gray-200 dark:border-white/10" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}
