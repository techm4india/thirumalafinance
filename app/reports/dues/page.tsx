'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import type { NPALoan } from '@/types'
import {
  PageHeader, Card, CardHeader, CardBody, Field, Input, Button, Badge,
  Money, DataTable, EmptyState, StatCard,
} from '@/components/ui'
import { formatDate } from '@/lib/finance'

type ReportKind = 'outstanding' | 'total-due' | 'cd-due' | 'a-to-b' | 'npa'

export default function DuesPage() {
  const router = useRouter()
  const [partners, setPartners] = useState<string[]>([])
  const [partner, setPartner] = useState('')
  const [kind, setKind] = useState<ReportKind>('npa')
  const [rows, setRows] = useState<NPALoan[]>([])
  const [aadhaar, setAadhaar] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => { loadPartners() }, [])
  useEffect(() => { load() }, [partner, aadhaar, name])

  async function loadPartners() {
    try {
      const r = await fetch('/api/partners')
      const d = await r.json().catch(() => [])
      setPartners((Array.isArray(d) ? d : []).map((p: any) => p.name).filter(Boolean))
    } catch {}
  }

  async function load() {
    setLoading(true)
    try {
      const qs = new URLSearchParams()
      if (partner) qs.append('partner', partner)
      if (aadhaar) qs.append('aadhaar', aadhaar)
      if (name) qs.append('name', name)
      const r = await fetch(`/api/reports/npa?${qs.toString()}`)
      setRows(r.ok ? (await r.json()) || [] : [])
    } finally { setLoading(false) }
  }

  const total = rows.reduce((s, l) => s + (Number(l.npaAmount) || 0), 0)

  return (
    <div>
      <PageHeader
        title="Dues Ledger"
        subtitle="Outstanding, NPA, and partner-wise due lists with grace/penalty already applied"
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Reports', href: '/reports' }, { label: 'Dues' }]}
        actions={<Button onClick={() => router.back()}><ArrowLeft className="w-4 h-4" />Back</Button>}
      />

      <div className="p-6 grid gap-6 lg:grid-cols-[260px_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Partners" subtitle={partners.length ? `${partners.length} partners` : 'No partners'} />
            <CardBody className="!p-0">
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                <button onClick={() => setPartner('')} className={`w-full text-left px-4 py-2 text-sm ${!partner ? 'bg-slate-900 text-white' : 'hover:bg-slate-50'}`}>
                  All partners
                </button>
                {partners.map((p, i) => (
                  <button key={i} onClick={() => setPartner(p)} className={`w-full text-left px-4 py-2 text-sm ${partner === p ? 'bg-slate-900 text-white' : 'hover:bg-slate-50'}`}>
                    {p}
                  </button>
                ))}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Report" />
            <CardBody className="!p-0">
              <div className="divide-y divide-slate-100">
                {([
                  ['outstanding', 'Outstanding'],
                  ['total-due', 'Total Due List'],
                  ['cd-due', 'CD Due List'],
                  ['a-to-b', 'A → B Due List'],
                  ['npa', 'NPA List'],
                ] as Array<[ReportKind, string]>).map(([k, label]) => (
                  <button key={k} onClick={() => setKind(k)} className={`w-full text-left px-4 py-2 text-sm ${kind === k ? 'bg-slate-900 text-white' : 'hover:bg-slate-50'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Records" value={rows.length} />
            <StatCard label="NPA total" value={<Money value={total} tone="debit" />} />
            <StatCard label="Filter" value={partner || 'All partners'} />
          </div>

          <Card>
            <CardHeader
              title={kind.toUpperCase()}
              subtitle="Filter by Aadhaar or customer name"
              actions={<Badge tone={loading ? 'warn' : 'info'}>{loading ? 'Loading…' : 'Live'}</Badge>}
            />
            <CardBody>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <Field label="Aadhaar"><Input value={aadhaar} onChange={e => setAadhaar(e.target.value)} placeholder="Search by Aadhaar" /></Field>
                <Field label="Name"><Input value={name} onChange={e => setName(e.target.value)} placeholder="Search by name" /></Field>
              </div>

              {rows.length === 0 ? (
                <EmptyState title={loading ? 'Loading…' : 'No records'} description="Try adjusting the filters above." />
              ) : (
                <div className="overflow-x-auto">
                  <DataTable>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Ref</th>
                        <th>Name</th>
                        <th className="text-right">NPA amount</th>
                        <th>Aadhaar</th>
                        <th>Phone</th>
                        <th>NPA date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(l => (
                        <tr key={l.id}>
                          <td>{formatDate(l.date)}</td>
                          <td><Badge tone="info">{l.loanType}</Badge> <span className="ml-1 text-slate-600">#{l.number}</span></td>
                          <td className="font-medium text-slate-900">{l.name}</td>
                          <td className="text-right"><Money value={Number(l.npaAmount) || 0} tone="debit" plain /></td>
                          <td>{l.aadhaar || '—'}</td>
                          <td>{l.phone || '—'}</td>
                          <td>{l.npaDate ? formatDate(l.npaDate) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </DataTable>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}
