import { ReactNode } from 'react'

export default function ChartCard({ title, note, children }: { title: string, note?: ReactNode, children: ReactNode }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="text-lg font-semibold">{title}</div>
        {note && <span className="text-xs px-2 py-1 rounded-md bg-black/5 border border-black/10 text-gray-700 dark:bg-white/5 dark:border-white/10 dark:text-gray-300">{note}</span>}
      </div>
      <div className="h-72 pb-6">
        {children}
      </div>
    </div>
  )
}
