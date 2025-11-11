import { exportToExcel, importFromExcel } from '@/lib/excel'
import { useStore } from '@/store'
import { useRef } from 'react'
import { toast } from '@/components/ToastContainer'

export default function ImportExport() {
  const fileRef = useRef<HTMLInputElement>(null)
  const reports = useStore(s=>s.reports)
  const txs = useStore(s=>s.transactions)

  return (
    <div className="flex gap-2">
      <input ref={fileRef} type="file" accept=".xlsx" className="hidden" onChange={async (e)=>{
        const f = e.target.files?.[0]
        if (!f) return
        try {
          const { reports, transactions } = await importFromExcel(f)
          useStore.setState({ reports, transactions })
          toast.success('Imported Excel data successfully.')
        } catch (err: any) {
          toast.error(err?.message || 'Failed to import Excel file.')
        }
        e.currentTarget.value = ''
      }} />
      <button className="btn-secondary" onClick={()=>fileRef.current?.click()}>Import Excel</button>
      <button className="btn-primary" onClick={async ()=> { 
        try {
          await exportToExcel(reports, txs)
          toast.success('Exported Excel file downloaded.')
        } catch (err: any) {
          toast.error(err?.message || 'Failed to export Excel file.')
        }
      }}>Export Excel</button>
    </div>
  )
}
