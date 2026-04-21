'use client'

/**
 * STBD Ledger — Short Term Balance Deposit (instalment plan).
 * Accounts list, account details, instalment schedule with status, live totals.
 */

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Printer } from 'lucide-react'
import type { Loan, LedgerTransaction } from '@/types'
import {
  PageHeader, Card, CardHeader, CardBody, Button, Field, Input,
  Money, Badge, InfoGrid, DataTable, EmptyState,
} from '@/components/ui'
import { calcSTBD, formatDate, getEffectiveRule as getLedgerRule } from '@/lib/finance'

export default function STBDLedgerPage() {
  const router = useRouter()
  const [accounts, setAccounts] = useState<Loan[]>([])
  const [selected, setSelected] = useState<string>('')
  const [loan, setLoan] = useState<any>({})
  const [txns, setTxns] = useState<LedgerTransaction[]>([])
  const [search, setSearch] = useState('')
  const rule = getLedgerRule('STBD')

  useEffect(() => {
    fetch('/api/loans?type=STBD')
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
    const totalInstallments = Math.max(1, Number(loan.period) || 100)
    const amountPaid = txns.reduce((s, t) => s + (Number(t.debit) || 0), 0)
    return calcSTBD({
      principal: Number(loan.loanAmount) || 0,
      loanDate: loan.date,
      rate: loan.rateOfInterest ?? rule.defaultRate,
      totalInstallments,
      installmentFrequencyDays: 1,
      amountPaid,
    })
  }, [loan, txns, rule.defaultRate])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return !q ? accounts : accounts.filter(a =>
      (a.customerName || '').toLowerCase().includes(q) || String(a.number || '').includes(q))
  }, [accounts, search])

  return (
    <div>
      <PageHeader
        title="STBD Ledger"
        subtitle="Short Term Balance Deposit · daily/weekly instalments"
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Ledgers' }, { label: 'STBD' }]}
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
                        <Badge tone="info">STBD</Badge>
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
            <Card><CardBody><EmptyState title="Select an STBD account" description="Pick an account to see instalment schedule and totals." /></CardBody></Card>
          ) : (
            <>
              <Card>
                <CardHeader title={loan.customerName || '—'} subtitle={`STBD #${loan.number} · ${formatDate(loan.date)}`} actions={<Badge tone="info">STBD</Badge>} />
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
                      <Field label="Total installments"><Input type="number" value={loan.period ?? ''} onChange={e => setLoan({ ...loan, period: Number(e.target.value) || 0 })} /></Field>
                      <Field label="Date"><Input type="date" value={loan.date || ''} onChange={e => setLoan({ ...loan, date: e.target.value })} /></Field>
                    </div>
                  </CardBody>
                </Card>
                <Card>
                  <CardHeader title="Summary" />
                  <CardBody>
                    {!calc ? <p className="text-sm text-slate-500">Enter principal and date.</p> : (
                      <InfoGrid columns={2} items={[
                        { label: 'Installments',    value: calc.totalInstallments },
                        { label: 'Each instalment', value: <Money value={calc.installmentAmount} /> },
                        { label: 'Total interest',  value: <Money value={calc.totalInterest} tone="debit" /> },
                        { label: 'Total amount',    value: <Money value={calc.totalAmount} /> },
                        { label: 'Amount paid',     value: <Money value={calc.amountPaid} tone="credit" /> },
                        { label: 'Late fees',       value: <Money value={calc.lateFees} tone="debit" /> },
                        { label: 'Due amount',      value: <Money value={calc.dueAmount} tone="debit" /> },
                        { label: 'Total payable',   value: <Money value={calc.totalPayable} tone="debit" /> },
                      ]} />
                    )}
                  </CardBody>
                </Card>
              </div>

              <Card>
                <CardHeader title="Instalment schedule" subtitle="Showing next 40 rows" />
                <CardBody className="!p-0">
                  {!calc ? <div className="p-5 text-sm text-slate-500">—</div> : (
                    <DataTable className="!border-0 !rounded-none">
                      <thead>
                        <tr><th>#</th><th>Due date</th><th className="text-right">Instalment</th><th className="text-right">Balance</th><th>Status</th></tr>
                      </thead>
                      <tbody>
                        {calc.schedule.slice(0, 40).map(r => (
                          <tr key={r.sn}>
                            <td>{r.sn}</td>
                            <td>{formatDate(r.dueDate)}</td>
                            <td className="text-right"><Money value={r.installment} /></td>
                            <td className="text-right"><Money value={r.balance} tone={r.balance > 0 ? 'debit' : 'credit'} /></td>
                            <td>
                              {r.status === 'paid'     && <Badge tone="credit">Paid</Badge>}
                              {r.status === 'due'      && <Badge tone="info">Due today</Badge>}
                              {r.status === 'overdue'  && <Badge tone="warn">Overdue</Badge>}
                              {r.status === 'upcoming' && <Badge tone="muted">Upcoming</Badge>}
                            </td>
                          </tr>
                        ))}
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
