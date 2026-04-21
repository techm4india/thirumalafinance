'use client'

/** Small half-page receipt printed on every loan disbursal / payment. */

import type { Loan } from '@/types'
import { formatDate, formatINR, getEffectiveRule } from '@/lib/finance'

export default function ReceiptSheet({
  loan,
  amount,
  kind = 'disbursal',
  number,
  note,
  companyName = 'Tirumala Finance',
  companyAddress = 'Head Office · Andhra Pradesh, India',
  companyPhone = '+91 ______________',
}: {
  loan: Partial<Loan>
  amount: number
  kind?: 'disbursal' | 'payment' | 'close' | 'renewal'
  number?: string | number
  note?: string
  companyName?: string
  companyAddress?: string
  companyPhone?: string
}) {
  const rule = getEffectiveRule(loan.loanType)
  const kindLabel = {
    disbursal: 'Loan Disbursal Receipt',
    payment: 'Payment Receipt',
    close: 'Loan Closure Receipt',
    renewal: 'Loan Renewal Receipt',
  }[kind]

  return (
    <div className="receipt-sheet bg-white text-slate-900 mx-auto shadow print:shadow-none"
         style={{ width: '210mm', minHeight: '148mm', padding: '12mm', boxSizing: 'border-box' }}>
      <header className="flex items-start justify-between border-b-2 border-slate-900 pb-2 mb-3">
        <div>
          <h1 className="text-xl font-bold">{companyName}</h1>
          <p className="text-[10px] text-slate-600">{companyAddress}</p>
          <p className="text-[10px] text-slate-600">{companyPhone}</p>
        </div>
        <div className="text-right text-xs">
          <div className="font-semibold">{kindLabel}</div>
          <div>Ref: <span className="font-mono">{loan.loanType || '—'}-{loan.number ?? '—'}</span></div>
          {number && <div>Receipt #: <span className="font-mono">{number}</span></div>}
          <div>Date: {formatDate(new Date().toISOString())}</div>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 text-xs mb-4">
        <div>
          <div className="text-[10px] uppercase text-slate-500">Received from</div>
          <div className="font-semibold text-sm">{loan.customerName || '—'}</div>
          <div className="text-[11px] text-slate-600">{loan.address || ''}</div>
          <div className="text-[11px]">Phone: {loan.phone1 || '—'}</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase text-slate-500">Amount</div>
          <div className="text-2xl font-bold">{formatINR(amount)}</div>
          <div className="text-[10px] text-slate-500">{rule.label}</div>
        </div>
      </div>

      {note && <p className="text-xs italic text-slate-700 mb-4">{note}</p>}

      <div className="mt-6 grid grid-cols-2 gap-6 text-xs text-center">
        <div className="pt-8 border-t border-slate-400">Customer signature</div>
        <div className="pt-8 border-t border-slate-400">Authorised signatory</div>
      </div>
    </div>
  )
}
