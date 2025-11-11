Laundry Tracker (SPA)

Overview
- React + Vite + TypeScript SPA with Tailwind (dark), Zustand, Recharts.
- Local-first persistence via Zustand’s persist (localStorage).
- Pages: Dashboard, Data Entry, Records.

Getting Started
1) Install deps
   npm install

2) Run dev server
   npm run dev

3) Build for production
   npm run build
   npm run preview

Notes
- All data is stored locally in your browser. Clear site data to reset.
- Storage is intentionally abstracted in `src/lib/datastore.ts` so you can swap to an API later.
- Currency defaults to MYR; tweak `formatCurrency` in `src/lib/utils.ts`.
- The UI is minimal but mirrors the requested flows; extend charts and filters as you record data.
- Import/Export Excel: In Records page, use the buttons to export the current data into `WeeklyReports` and `Transactions` sheets, or import an `.xlsx` file to replace the current data.

Structure
- src/App.tsx: routes + layout
- src/pages/: Dashboard, DataEntry, Records
- src/store.ts: Zustand store and actions
- src/lib/utils.ts: helpers + aggregations
- src/lib/datastore.ts: swappable storage interface (currently local)
