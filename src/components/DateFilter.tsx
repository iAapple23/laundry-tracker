import { useMemo, useState } from 'react'
import { rangeThisMonth, rangeLastMonth } from '@/lib/utils'
import { DateRange } from '@/types'
import { addDays, addMonths, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfMonth, startOfWeek, subMonths } from 'date-fns'

type Props = {
  value: DateRange
  onChange: (r: DateRange) => void
}

export default function DateFilter({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [fromSel, setFromSel] = useState<Date>(value.from)
  const [toSel, setToSel] = useState<Date>(value.to)
  const [viewMonth, setViewMonth] = useState<Date>(startOfMonth(value.from))
  const [selecting, setSelecting] = useState<'from'|'to'>('from')

  const isActive = (r: DateRange) => value.from.toDateString() === r.from.toDateString() && value.to.toDateString() === r.to.toDateString()

  const btn = (label: string, r: DateRange) => (
    <button
      className={`btn ${
        isActive(r)
          ? 'bg-brand text-white'
          : 'bg-black/10 text-gray-700 border border-black/10 hover:bg-black/20 dark:bg-white/10 dark:text-gray-200 dark:border-white/10 dark:hover:bg-white/20'
      }`}
      onClick={()=> onChange(r)}
    >{label}</button>
  )

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {btn('This Month', rangeThisMonth())}
      {btn('Last Month', rangeLastMonth())}
      <button className="btn bg-black/10 text-gray-700 border border-black/10 hover:bg-black/20 dark:bg-white/10 dark:text-gray-200 dark:border-white/10 dark:hover:bg-white/20" onClick={()=>{ setFromSel(value.from); setToSel(value.to); setSelecting('from'); setViewMonth(startOfMonth(value.from)); setOpen(true) }}>More</button>

      {open && (()=>{
        const invalid = fromSel > toSel
        const days = Math.round((+toSel - +fromSel)/86400000) + 1
        const start = startOfWeek(startOfMonth(viewMonth), { weekStartsOn: 1 })
        const end = endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 1 })
        const dates: Date[] = []
        for (let d = start; d <= end; d = addDays(d,1)) dates.push(d)
        const isInRange = (d: Date) => d >= fromSel && d <= toSel
        return (
          <div className="fixed inset-0 z-40 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60" onClick={()=>setOpen(false)}></div>
            <div className="relative z-50 w-[640px] max-w-[95vw] rounded-xl bg-white border border-black/10 shadow-card dark:bg-gray-900 dark:border-white/10">
              <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-black/10 dark:border-white/10">
                <div className="text-lg font-semibold">Custom Date Filter</div>
                <button
                  className="btn bg-black/10 text-gray-700 border border-black/10 hover:bg-black/20 dark:bg-white/10 dark:text-gray-200 dark:border-white/10 dark:hover:bg-white/20"
                  onClick={()=>setOpen(false)} aria-label="Close"
                >✕</button>
              </div>
              <div className="px-6 py-5 space-y-4">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Select:</span>
                  <button className={`btn ${selecting==='from'?'bg-brand text-white':'bg-black/10 text-gray-700 border border-black/10 hover:bg-black/20 dark:bg-white/10 dark:text-gray-200 dark:border-white/10 dark:hover:bg-white/20'}`} onClick={()=>setSelecting('from')}>From {fromSel.toLocaleDateString()}</button>
                  <button className={`btn ${selecting==='to'?'bg-brand text-white':'bg-black/10 text-gray-700 border border-black/10 hover:bg-black/20 dark:bg-white/10 dark:text-gray-200 dark:border-white/10 dark:hover:bg-white/20'}`} onClick={()=>setSelecting('to')}>To {toSel.toLocaleDateString()}</button>
                </div>
                <div className="rounded-md p-3 bg-black/5 border border-black/10 dark:bg-gray-800/40 dark:border-white/10">
                  <div className="flex items-center justify-between px-1">
                    <button className="btn bg-black/10 text-gray-700 border border-black/10 hover:bg-black/20 dark:bg-white/10 dark:text-gray-200 dark:border-white/10 dark:hover:bg-white/20" onClick={()=> setViewMonth(subMonths(viewMonth,1))}>‹</button>
                    <div className="text-sm text-gray-700 dark:text-gray-200 font-medium">{format(viewMonth, 'MMMM yyyy')}</div>
                    <button className="btn bg-black/10 text-gray-700 border border-black/10 hover:bg-black/20 dark:bg-white/10 dark:text-gray-200 dark:border-white/10 dark:hover:bg-white/20" onClick={()=> setViewMonth(addMonths(viewMonth,1))}>›</button>
                  </div>
                  <div className="grid grid-cols-7 gap-1 mt-3 text-center text-xs text-gray-400">
                    {['Mo','Tu','We','Th','Fr','Sa','Su'].map(d => <div key={d} className="py-1">{d}</div>)}
                  </div>
                  <div className="grid grid-cols-7 gap-1 mt-1">
                    {dates.map((d, i) => {
                      const out = !isSameMonth(d, viewMonth)
                      const isStart = isSameDay(d, fromSel)
                      const isEnd = isSameDay(d, toSel)
                      const inRangeCell = isInRange(d) && !isStart && !isEnd
                      return (
                        <button
                          key={i}
                          className={`h-9 sm:h-10 rounded-md text-sm flex items-center justify-center transition-colors border border-transparent
                            ${isStart || isEnd ? 'bg-brand text-white' : inRangeCell ? 'bg-black/10 text-gray-800 dark:bg-white/10 dark:text-gray-100' : 'bg-transparent'}
                            ${out ? 'text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-gray-200'}
                          `}
                          onClick={()=>{
                            if (selecting==='from') {
                              if (d > toSel) { setFromSel(d); setToSel(d) } else { setFromSel(d) }
                              setSelecting('to')
                            } else {
                              if (d < fromSel) { setFromSel(d); setToSel(d) } else { setToSel(d) }
                              setSelecting('from')
                            }
                          }}
                        >
                          {d.getDate()}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs text-gray-600 dark:text-gray-400 self-center mr-2">Quick picks</span>
                <button className="btn bg-black/10 text-gray-700 border border-black/10 hover:bg-black/20 dark:bg-white/10 dark:text-gray-200 dark:border-white/10 dark:hover:bg-white/20" onClick={()=>{ const r = rangeThisMonth(); setFromSel(r.from); setToSel(r.to); setViewMonth(startOfMonth(r.from)) }}>This Month</button>
                <button className="btn bg-black/10 text-gray-700 border border-black/10 hover:bg-black/20 dark:bg-white/10 dark:text-gray-200 dark:border-white/10 dark:hover:bg-white/20" onClick={()=>{ const r = rangeLastMonth(); setFromSel(r.from); setToSel(r.to); setViewMonth(startOfMonth(r.from)) }}>Last Month</button>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className={`text-gray-600 dark:text-gray-400 ${invalid ? 'text-red-600 dark:text-red-400' : ''}`}>
                    {invalid ? 'Invalid range' : `${fromSel.toLocaleDateString()} - ${toSel.toLocaleDateString()} (${days} day${days!==1?'s':''})`}
                  </div>
                  <div className="flex gap-2">
                    <button className="btn-secondary" onClick={()=>setOpen(false)}>Cancel</button>
                    <button className={`btn-primary ${invalid ? 'opacity-50 pointer-events-none' : ''}`} onClick={()=>{ onChange({ from: fromSel, to: toSel }); setOpen(false) }}>Apply</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
