export type ID = string

export type WeekOfMonth = 1 | 2 | 3 | 4 | 5

export interface WeeklyReport {
  id: ID
  year: number
  month: number // 0-11
  week: WeekOfMonth
  washer1: number
  washer2: number
  dryer1: number
  dryer2: number
  online: number
  offline: number
  totalSales: number
  moneyCollected: number
  notes?: string
  createdAt: string // ISO
}

export type TxType = 'expense' | 'refund'

export interface Transaction {
  id: ID
  date: string // ISO
  type: TxType
  amount: number // positive value stored; sign handled in metrics
  description?: string
  createdAt: string
}

export interface DateRange { from: Date; to: Date }

