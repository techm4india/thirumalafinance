'use client'

/**
 * TBD Ledger — Term Balance Deposit (monthly compounding to maturity).
 * Accounts list, account details, live maturity projection, transactions.
 */

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Printer } from 'lucide-react'
import type { Loan, LedgerTransaction } from '@/types'
import {
  PageHeader, Card, CardHeader, CardBody, Button, Field, Input,
  Money, Badge, InfoGrid, DataTable, EmptyState,
} from '@/components/ui'
import { calcTBD, formatDate, getEffectiveRule as getLedgerRule } from '@/lib/finance'

export default function TBDLedgerPage() {
  const router = useRouter()
  const [accounts, setAccounts] = useState<Loan[]>([])
  const [selected, setSelected] = useState<string>('')
  const [loan, setLoan] = useState<any>({})
  const [txns, setTxns] = useState<LedgerTransaction[]>([])
  const [search, setSearch] = useState('')
  const rule = getLedgerRule('TBD')

  useEffect(() => {
    fetch('/api/loans?type=TBD')
      .then(r => r.ok ? r.json() : [])
      .then(d => setAccounts(Array.isArray(d) ? d : []))
      .catch(() => setAccounts([]))
  }, [])

  useEffect(() => {
    if (!selected) return
    fetch(`/api/loans/${selected}`).then(r => r.ok ? r.json() : null).then(d => d && setLoan(d)).catch(() => {})
    fetch(`/api/ledger/${selected}`).then(r => r.ok ? r.json() : []).then(d => setTxns(Array.isArray(d) ? d : [])).catch(() => setTxns([]))
  }, [selected])

  const calc = useMemo(() => {
    if (!loan.loanAmount || !loan.date) return null
    // TBD tenure stored as days in legacy schema — convert to months
    const tenureMonths = Math.max(1, Math.round((Number(loan.period) || 360) / 30))
    const amountPaid = txns.reduce((s, t) => s + (Number(t.debit) || 0), 0)
    return calcTBD({
      principal: Number(loan.loanAmount) || 0,
      loanDate: loan.date,
      rate: loan.rateOfInterest ?? rule.defaultRate,
      tenureMonths,
      amountPaid,
    })
  }, [loan, txns, rule.defaultRate])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return !q ? accounts : accounts.filter(a =>
      (a.customerName || '').toLowerCase().includes(q) || String(a.number || '').includes(q))
  }, [accounts, search])

  const txnTotals = useMemo(() => {
    const debit = txns.reduce((s, t) => s + (Number(t.debit) || 0), 0)
    const credit = txns.reduce((s, t) => s + (Number(t.credit) || 0), 0)
    return { debit, credit, net: credit - debit }
  }, [txns])

  return (
    <div>
      <PageHeader
        title="TBD Ledger"
        subtitle="Term Balance Deposit · monthly compounding to maturity"
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Ledgers' }, { label: 'TBD' }]}
        actions={
          <>
            <Button onClick={() => router.back()}><ArrowLeft className="w-4 h-4" />Back</Button>
            <Button onClick={() => typeof window !== 'undefined' && window.print()}><Printer className="w-4 h-4" />Print</Button>
          </>
        }
      />

      <div className="p-6 grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card className="no-print lg:sticky lg:top-16 self-start max-h-[calc(100vh-5rem)] overflow-hidden flex flex-col">
          <CardHeader title="Accounts" subtitle={`${accounts.length} total`} />
          <div className="px-4 pb-3"><Input placeholder="Search" value={search} onChange={e => setSearch(e.target.value)} /></div>
          <div className="overflow-y-auto scrollbar-thin border-t border-slate-100">
            {filtered.length === 0 ? <div className="p-5 text-sm text-slate-500">No matches.</div> : (
              <ul className="divide-y divide-slate-100">
                {filtered.map(a => (
                  <li key={a.id}>
                    <button onClick={() => setSelected(a.id!)} className={`w-full text-left px-4 py-3 text-sm ${selected === a.id ? 'bg-indigo-50 border-l-2 border-indigo-600' : 'hover:bg-slate-50'}`}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium text-slate-900 truncate">#{a.number} · {a.customerName}</div>
                        <Badge tone="info">TBD</Badge>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">{formatDate(a.date)} · <Money value={Number(a.loanAmount) || 0} plain className="text-slate-500" /></div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        <div className="space-y-6">
          {!selected ? (
            <Card><CardBody><EmptyState title="Select a TBD account" description="Pick an account to see maturity projection and transactions." /></CardBody></Card>
          ) : (
            <>
              <Card>
                <CardHeader title={loan.customerName || '—'} subtitle={`TBD #${loan.number} · ${formatDate(loan.date)}`} actions={<Badge tone="info">TBD</Badge>} />
                <CardBody>
                  <InfoGrid columns={4} items={[
                    { label: 'Aadhaar', value: loan.aadhaar || '—' },
                    { label: 'Phone', value: loan.phone1 || '—' },
                    { label: 'Address', value: loan.address || '—' },
                    { label: 'Partner', value: loan.partnerName || '—' },
                  ]} />
                </CardBody>
              </Card>

              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader title="Terms" />
                  <CardBody>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field label="Principal (₹)"><Input type="number" value={loan.loanAmount ?? ''} onChange={e => setLoan({ ...loan, loanAmount: Number(e.target.value) || 0 })} /></Field>
                      <Field label="Rate (% / month)"><Input type="number" step="0.01" value={loan.rateOfInterest ?? rule.defaultRate} onChange={e => setLoan({ ...loan, rateOfInterest: Number(e.target.value) })} /></Field>
                      <Field label="Tenure (days)"><Input type="number" value={loan.period ?? ''} onChange={e => setLoan({ ...loan, period: Number(e.target.value) || 0 })} /></Field>
                      <Field label="Date"><Input type="date" value={loan.date || ''} onChange={e => setLoan({ ...loan, date: e.target.value })} /></Field>
                    </div>
                  </CardBody>
                </Card>

                <Card>
                  <CardHeader title="Maturity projection" />
                  <CardBody>
                    {!calc ? <p className="text-sm text-slate-500">Enter principal and date.</p> : (
                      <InfoGrid columns={2} items={[
                        { label: 'Tenure',         value: `${calc.tenureMonths} months` },
                        { label: 'Elapsed',        value: `${calc.elapsedMonths} months` },
                        { label: 'Remaining',      value: `${calc.remainingMonths} months` },
                        { label: 'Premium so far', value: <Money value={calc.premium} tone="credit" /> },
                        { label: 'Maturity amount',value: <Money value={calc.maturityAmount} /> },
                        { label: 'Maturity date',  value: formatDate(calc.dueDate) },
                        { label: 'Paid',           value: <Money value={calc.paidAmount} tone="credit" /> },
                        { label: 'Due on maturity',value: <Money value={calc.dueAmount} tone="debit" /> },
                      ]} />
                    )}
                  </CardBody>
                </Card>
              </div>

              <Card>
                <CardHeader title="Transactions" subtitle={`${txns.length} entries`} />
                <CardBody className="!p-0">
                  {txns.length === 0 ? (
                    <div className="p-5 text-sm text-slate-500">No transactions yet.</div>
                  ) : (
                    <DataTable className="!border-0 !rounded-none">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Particulars</th>
                          <th className="text-right">Debit</th>
                          <th className="text-right">Credit</th>
                          <th className="text-right">Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {txns.map((t, i) => (
                          <tr key={(t as any).id || i}>
                            <td>{formatDate(t.date)}</td>
                            <td className="max-w-[320px] truncate">{t.particulars || '—'}</td>
                            <td className="text-right"><Money value={Number(t.debit) || 0} tone="debit" plain /></td>
                            <td className="text-right"><Money value={Number(t.credit) || 0} tone="credit" plain /></td>
                            <td className="text-right"><Money value={Number((t as any).balance) || 0} plain /></td>
                          </tr>
                        ))}
                        <tr className="bg-slate-50 font-medium">
                          <td colSpan={2} className="text-right">Totals</td>
                          <td className="text-right"><Money value={txnTotals.debit} tone="debit" /></td>
                          <td className="text-right"><Money value={txnTotals.credit} tone="credit" /></td>
                          <td className="text-right"><Money value={txnTotals.net} /></td>
                        </tr>
                      </tbody>
                    </DataTable>
                  )}
                </CardBody>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
