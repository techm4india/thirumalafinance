'use client'

/** Full statement — company header, customer block, running ledger, totals. */

import type { Loan, LedgerTransaction } from '@/types'
import { formatDate, formatINR, getEffectiveRule } from '@/lib/finance'

export default function StatementSheet({
  loan,
  transactions,
  from,
  to,
  companyName = 'Tirumala Finance',
  companyAddress = 'Head Office · Andhra Pradesh, India',
  companyPhone = '+91 ______________',
}: {
  loan: Partial<Loan>
  transactions: LedgerTransaction[]
  from?: string
  to?: string
  companyName?: string
  companyAddress?: string
  companyPhone?: string
}) {
  const rule = getEffectiveRule(loan.loanType)
  let running = 0
  const rows = transactions.map(t => {
    running += (Number(t.credit) || 0) - (Number(t.debit) || 0)
    return { ...t, balance: running }
  })
  const totals = transactions.reduce(
    (acc, t) => ({
      credit: acc.credit + (Number(t.credit) || 0),
      debit: acc.debit + (Number(t.debit) || 0),
    }),
    { credit: 0, debit: 0 }
  )

  return (
    <div className="statement-sheet bg-white text-slate-900 mx-auto shadow print:shadow-none"
         style={{ width: '210mm', minHeight: '297mm', padding: '14mm', boxSizing: 'border-box' }}>
      <header className="flex items-start justify-between border-b-2 border-slate-900 pb-3 mb-4">
        <div>
          <h1 className="text-xl font-bold">{companyName}</h1>
          <p className="text-[10px] text-slate-600">{companyAddress}</p>
          <p className="text-[10px] text-slate-600">{companyPhone}</p>
        </div>
        <div className="text-right text-xs">
          <div className="font-semibold">Loan Statement</div>
          <div>Ref: <span className="font-mono">{loan.loanType || '—'}-{loan.number ?? '—'}</span></div>
          <div>Customer: <span className="font-medium">{loan.customerName || '—'}</span></div>
          <div>From: {from ? formatDate(from) : '—'} &nbsp; To: {to ? formatDate(to) : '—'}</div>
          <div>Type: {rule.label}</div>
        </div>
      </header>

      <table className="w-full text-xs">
        <thead>
          <tr className="bg-slate-100 text-[10px] uppercase text-slate-600">
            <th className="text-left px-2 py-1">#</th>
            <th className="text-left px-2 py-1">Date</th>
            <th className="text-left px-2 py-1">Particulars</th>
            <th className="text-left px-2 py-1">R.No</th>
            <th className="text-right px-2 py-1">Debit</th>
            <th className="text-right px-2 py-1">Credit</th>
            <th className="text-right px-2 py-1">Balance</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={7} className="text-center py-6 text-slate-500 italic">No transactions.</td></tr>
          ) : rows.map((t, i) => (
            <tr key={i} className="border-b border-slate-100">
              <td className="px-2 py-1">{i + 1}</td>
              <td className="px-2 py-1">{formatDate(t.date)}</td>
              <td className="px-2 py-1">{t.particulars || '—'}</td>
              <td className="px-2 py-1">{t.rno || '—'}</td>
              <td className="px-2 py-1 text-right">{Number(t.debit) ? formatINR(Number(t.debit)) : ''}</td>
              <td className="px-2 py-1 text-right">{Number(t.credit) ? formatINR(Number(t.credit)) : ''}</td>
              <td className="px-2 py-1 text-right font-medium">{formatINR(t.balance)}</td>
            </tr>
          ))}
          <tr className="bg-slate-50 font-semibold">
            <td colSpan={4} className="px-2 py-1 text-right">Totals</td>
            <td className="px-2 py-1 text-right">{formatINR(totals.debit)}</td>
            <td className="px-2 py-1 text-right">{formatINR(totals.credit)}</td>
            <td className="px-2 py-1 text-right">{formatINR(totals.credit - totals.debit)}</td>
          </tr>
        </tbody>
      </table>

      <p className="mt-4 text-[10px] text-slate-500">
        E&amp;OE. Subject to verification. All rates quoted monthly. Grace period {rule.graceDays} days,
        penal interest {(rule.penaltyDailyRate * 30).toFixed(2)}% / month thereafter.
      </p>
    </div>
  )
}
