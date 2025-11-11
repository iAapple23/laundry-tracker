export default function Delta({ value, invert = false }: { value: number; invert?: boolean }) {
  const arrow = value >= 0 ? '↑' : '↓'
  const effective = invert ? -value : value
  const color = effective >= 0
    ? 'text-emerald-600 dark:text-emerald-400'
    : 'text-red-600 dark:text-red-400'
  return (
    <span className={color}>{arrow} {Math.abs(value).toFixed(2)}% from last month</span>
  )
}
