import { ReactNode } from 'react'

export default function MetricCard({ title, value, subtitle, icon }: { title: string, value: ReactNode, subtitle?: ReactNode, icon?: ReactNode }) {
  return (
    <div className="card p-5 self-start min-h-[120px]">
      <div className="text-sm text-gray-500 dark:text-gray-300">{title}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
      {subtitle && <div className="mt-1 text-xs text-gray-400">{subtitle}</div>}
    </div>
  )
}
