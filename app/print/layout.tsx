/**
 * /print/* uses a stripped-down layout — no sidebar, no chrome —
 * so the browser print dialog captures just the sheet.
 */
export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return <div className="print-root min-h-screen bg-slate-100">{children}</div>
}
