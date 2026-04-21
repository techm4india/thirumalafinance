'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Search as SearchIcon, RotateCcw, Printer } from 'lucide-react'
import type { Loan, LoanType } from '@/types'
import {
  PageHeader, Card, CardHeader, CardBody, Field, Input, Select,
  Button, Money, Badge, DataTable, EmptyState,
} from '@/components/ui'
import { formatDate, LEDGER_RULES } from '@/lib/finance'

const TYPES: LoanType[] = ['CD', 'HP', 'STBD', 'TBD', 'FD', 'OD', 'RD']

type Mode = 'normal' | 'aadhaar'

export default function SearchPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('normal')
  const [q, setQ] = useState({
    withName: '',
    withPhoneNumber: '',
    withInstallmentAmount: '',
    withLoanAmount: '',
    loanType: '' as LoanType | '',
    number: '',
    ledgerName: '',
    aadhaar: '',
  })
  const [rows, setRows] = useState<Loan[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)

  const set = (k: string, v: any) => setQ(p => ({ ...p, [k]: v }))

  async function run() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (mode === 'aadhaar') {
        if (q.aadhaar) params.append('aadhaar', q.aadhaar)
        if (q.withName) params.append('name', q.withName)
      } else {
        Object.entries(q).forEach(([k, v]) => { if (v && k !== 'aadhaar') params.append(k, String(v)) })
      }
      const r = await fetch(`/api/search/loans?${params.toString()}`)
      const d = await r.json().catch(() => ({}))
      const list = d.loans || d.allLoans || d.runningLoans || []
      setRows(Array.isArray(list) ? list : [])
      setTotal(d.total || (Array.isArray(list) ? list.length : 0))
    } catch { alert('Search failed') }
    finally { setLoading(false) }
  }

  function reset() {
    setQ({
      withName: '', withPhoneNumber: '', withInstallmentAmount: '',
      withLoanAmount: '', loanType: '', number: '', ledgerName: '', aadhaar: '',
    })
    setRows([]); setTotal(0)
  }

  return (
    <div>
      <PageHeader
        title="Find"
        subtitle="Search loans by name, phone, loan number, Aadhaar, and more"
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Search' }]}
        actions={<Button onClick={() => router.back()}><ArrowLeft className="w-4 h-4" />Back</Button>}
      />

      <div className="p-6 space-y-6">
        <Card>
          <CardHeader
            title="Search mode"
            actions={
              <div className="inline-flex rounded-lg border border-slate-200 p-1 bg-slate-50">
                <button
                  onClick={() => setMode('normal')}
                  className={`px-3 py-1 rounded-md text-sm ${mode === 'normal' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}
                >
                  Normal
                </button>
                <button
                  onClick={() => setMode('aadhaar')}
                  className={`px-3 py-1 rounded-md text-sm ${mode === 'aadhaar' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}
                >
                  Aadhaar
                </button>
              </div>
            }
          />
          <CardBody>
            {mode === 'aadhaar' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Aadhaar number"><Input value={q.aadhaar} onChange={e => set('aadhaar', e.target.value)} placeholder="12-digit Aadhaar" /></Field>
                <Field label="Name (optional)"><Input value={q.withName} onChange={e => set('withName', e.target.value)} /></Field>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Field label="Customer name"><Input value={q.withName} onChange={e => set('withName', e.target.value)} /></Field>
                <Field label="Phone"><Input type="tel" value={q.withPhoneNumber} onChange={e => set('withPhoneNumber', e.target.value)} /></Field>
                <Field label="Loan number"><Input value={q.number} onChange={e => set('number', e.target.value)} /></Field>
                <Field label="Loan amount">
                  <Input type="number" value={q.withLoanAmount} onChange={e => set('withLoanAmount', e.target.value)} />
                </Field>
                <Field label="Installment amount">
                  <Input type="number" value={q.withInstallmentAmount} onChange={e => set('withInstallmentAmount', e.target.value)} />
                </Field>
                <Field label="Ledger name"><Input value={q.ledgerName} onChange={e => set('ledgerName', e.target.value)} /></Field>
                <Field label="Loan type">
                  <Select value={q.loanType} onChange={e => set('loanType', e.target.value as LoanType)}>
                    <option value="">All</option>
                    {TYPES.map(t => <option key={t} value={t}>{LEDGER_RULES[t].label}</option>)}
                  </Select>
                </Field>
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <Button variant="primary" onClick={run} disabled={loading}>
                <SearchIcon className="w-4 h-4" />{loading ? 'Searching…' : 'Search'}
              </Button>
              <Button onClick={reset}><RotateCcw className="w-4 h-4" />Reset</Button>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Results"
            subtitle={`${total} record(s)`}
            actions={<Badge tone="info">{loading ? 'Loading…' : `${rows.length} rows`}</Badge>}
          />
          <CardBody className="!p-0">
            {rows.length === 0 ? (
              <div className="p-6"><EmptyState title={loading ? 'Searching…' : 'No matches yet'} description="Fill any of the fields above and search." /></div>
            ) : (
              <div className="overflow-x-auto">
                <DataTable className="!border-0 !rounded-none">
                  <thead>
                    <tr>
                      <th>Ref</th>
                      <th>Date</th>
                      <th>Name</th>
                      <th>Father</th>
                      <th className="text-right">Amount</th>
                      <th className="text-right">Installment</th>
                      <th>Phone</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(l => {
                      const inst = (l.loanType === 'STBD' || l.loanType === 'HP')
                        ? (Number(l.loanAmount) || 0) / (Number(l.period) || 1)
                        : 0
                      return (
                        <tr key={l.id}>
                          <td>
                            <Badge tone="info">{l.loanType}</Badge>
                            <span className="ml-2 text-slate-600">#{l.number}</span>
                          </td>
                          <td>{formatDate(l.date)}</td>
                          <td className="font-medium text-slate-900">{l.customerName}</td>
                          <td>{l.fatherName || '—'}</td>
                          <td className="text-right"><Money value={Number(l.loanAmount) || 0} plain /></td>
                          <td className="text-right">{inst > 0 ? <Money value={inst} plain /> : <span className="text-slate-400">—</span>}</td>
                          <td>{l.phone1 || '—'}</td>
                          <td className="text-right">
                            {l.id ? (
                              <Link href={`/print/loan/${l.id}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-700 text-xs">
                                <Printer className="w-3.5 h-3.5" /> Print
                              </Link>
                            ) : null}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </DataTable>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
