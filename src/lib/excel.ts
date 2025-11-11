import { WeeklyReport, Transaction } from '@/types'

async function loadXLSX() {
  // Local-only: assumes `xlsx` is installed in node_modules
  try {
    const mod: any = await import('xlsx')
    return mod?.default ?? mod
  } catch (e) {
    throw new Error('Excel support is unavailable (xlsx failed to load). Please run `npm install xlsx` and reload the app.')
  }
}

export async function exportToExcel(reports: WeeklyReport[], transactions: Transaction[]) {
  const XLSX: any = await loadXLSX()
  const wb = XLSX.utils.book_new()

  const reportSheet = XLSX.utils.json_to_sheet(reports.map(r => ({
    id: r.id,
    year: r.year,
    month: r.month,
    week: r.week,
    washer1: r.washer1,
    washer2: r.washer2,
    dryer1: r.dryer1,
    dryer2: r.dryer2,
    online: r.online,
    offline: r.offline,
    totalSales: r.totalSales,
    moneyCollected: r.moneyCollected,
    notes: r.notes ?? '',
    createdAt: r.createdAt,
  })))
  XLSX.utils.book_append_sheet(wb, reportSheet, 'WeeklyReports')

  const txSheet = XLSX.utils.json_to_sheet(transactions.map(t => ({
    id: t.id,
    date: t.date,
    type: t.type,
    amount: t.amount,
    description: t.description ?? '',
    createdAt: t.createdAt,
  })))
  XLSX.utils.book_append_sheet(wb, txSheet, 'Transactions')

  const fname = `laundry-data-${new Date().toISOString().slice(0,10)}.xlsx`
  XLSX.writeFile(wb, fname)
}

export async function importFromExcel(file: File): Promise<{ reports: WeeklyReport[]; transactions: Transaction[] }> {
  const XLSX: any = await loadXLSX()
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array' })

  const getSheet = (name: string) => wb.Sheets[name] || wb.Sheets[wb.SheetNames.find((n: string) => n.toLowerCase() === name.toLowerCase()) || '']

  const rs = getSheet('WeeklyReports')
  const ts = getSheet('Transactions')

  const reports = rs ? (XLSX.utils.sheet_to_json(rs) as any[]).map((row: any) => ({
    id: String(row.id),
    year: Number(row.year),
    month: Number(row.month),
    week: Number(row.week) as any,
    washer1: Number(row.washer1) || 0,
    washer2: Number(row.washer2) || 0,
    dryer1: Number(row.dryer1) || 0,
    dryer2: Number(row.dryer2) || 0,
    online: Number(row.online) || 0,
    offline: Number(row.offline) || 0,
    totalSales: Number(row.totalSales) || 0,
    moneyCollected: Number(row.moneyCollected) || 0,
    notes: row.notes ? String(row.notes) : undefined,
    createdAt: row.createdAt ? String(row.createdAt) : new Date().toISOString(),
  })) as WeeklyReport[] : []

  const transactions = ts ? (XLSX.utils.sheet_to_json(ts) as any[]).map((row: any) => ({
    id: String(row.id),
    date: String(row.date),
    type: (String(row.type).toLowerCase() === 'refund' ? 'refund' : 'expense') as 'expense'|'refund',
    amount: Number(row.amount) || 0,
    description: row.description ? String(row.description) : undefined,
    createdAt: row.createdAt ? String(row.createdAt) : new Date().toISOString(),
  })) as Transaction[] : []

  return { reports, transactions }
}
