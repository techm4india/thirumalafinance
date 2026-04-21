'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Printer, RefreshCw } from 'lucide-react'
import {
  PageHeader, Card, CardHeader, CardBody, Field, Input, Select, Button, Money,
  StatCard, DataTable, EmptyState, Badge,
} from '@/components/ui'
import { formatDate } from '@/lib/finance'

interface NewCustomer {
  id: string
  customerName: string
  fatherName?: string
  aadhaar?: string
  address: string
  phone1?: string
  phone2?: string
  firstLoanDate: string
  firstLoanNumber: string
  firstLoanAmount: number
  totalLoans: number
  totalLoanAmount: number
}

export default function NewCustomersPage() {
  const router = useRouter()
  const [fromDate, setFromDate] = useState('2013-04-25')
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0])
  const [customers, setCustomers] = useState<NewCustomer[]>([])
  const [filtered, setFiltered] = useState<NewCustomer[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedPartner, setSelectedPartner] = useState<string>('')
  const [partners, setPartners] = useState<string[]>([])

  useEffect(() => { loadPartners(); load() }, [])
  useEffect(() => { load() }, [fromDate, toDate, selectedPartner])

  useEffect(() => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) { setFiltered(customers); return }
    setFiltered(customers.filter(c =>
      c.customerName?.toLowerCase().includes(q) ||
      c.fatherName?.toLowerCase().includes(q) ||
      c.aadhaar?.includes(searchTerm) ||
      c.phone1?.includes(searchTerm) ||
      c.phone2?.includes(searchTerm) ||
      c.address?.toLowerCase().includes(q)
    ))
  }, [searchTerm, customers])

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
      const params = new URLSearchParams()
      params.append('fromDate', fromDate)
      params.append('toDate', toDate)
      if (selectedPartner) params.append('partner', selectedPartner)
      const r = await fetch(`/api/reports/new-customers?${params.toString()}`)
      const d = await r.json().catch(() => ({}))
      const list = d.customers || []
      setCustomers(list); setFiltered(list)
    } finally { setLoading(false) }
  }

  const totalLoanAmount = filtered.reduce((s, c) => s + (Number(c.totalLoanAmount) || 0), 0)
  const totalFirst = filtered.reduce((s, c) => s + (Number(c.firstLoanAmount) || 0), 0)
  const totalLoans = filtered.reduce((s, c) => s + (Number(c.totalLoans) || 0), 0)

  return (
    <div>
      <PageHeader
        title="New Customers"
        subtitle="First-time borrowers in the selected period"
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Reports', href: '/reports' }, { label: 'New Customers' }]}
        actions={
          <>
            <Button onClick={() => router.back()}><ArrowLeft className="w-4 h-4" />Back</Button>
            <Button onClick={load}><RefreshCw className="w-4 h-4" />Refresh</Button>
            <Button variant="primary" onClick={() => window.print()}><Printer className="w-4 h-4" />Print</Button>
          </>
        }
      />

      <div className="p-6 space-y-6">
        <Card>
          <CardBody>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <Field label="From"><Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} /></Field>
              <Field label="To"><Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} /></Field>
              <Field label="Partner">
                <Select value={selectedPartner} onChange={e => setSelectedPartner(e.target.value)}>
                  <option value="">All partners</option>
                  {partners.map(p => <option key={p} value={p}>{p}</option>)}
                </Select>
              </Field>
              <Field label="Search"><Input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Name, phone, Aadhaar…" /></Field>
            </div>
          </CardBody>
        </Card>

        <div className="grid gap-4 sm:grid-cols-4">
          <StatCard label="New customers" value={filtered.length} />
          <StatCard label="First loan total" value={<Money value={totalFirst} />} />
          <StatCard label="Total loans" value={totalLoans} />
          <StatCard label="Total amount" value={<Money value={totalLoanAmount} />} />
        </div>

        <Card className="print-card">
          <CardHeader
            title="Customer list"
            subtitle={`${filtered.length} of ${customers.length}`}
            actions={<Badge tone={loading ? 'warn' : 'info'}>{loading ? 'Loading…' : 'Live'}</Badge>}
          />
          <CardBody className="!p-0">
            {filtered.length === 0 ? (
              <div className="p-6"><EmptyState title={loading ? 'Loading…' : 'No new customers'} description="Try widening the date range or switching partner." /></div>
            ) : (
              <div className="overflow-x-auto">
                <DataTable className="!border-0 !rounded-none">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Date</th>
                      <th>Customer</th>
                      <th>Father</th>
                      <th>Aadhaar</th>
                      <th>Address</th>
                      <th>Phone 1</th>
                      <th>Phone 2</th>
                      <th>First loan</th>
                      <th className="text-right">First amt</th>
                      <th className="text-right">Loans</th>
                      <th className="text-right">Total amt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((c, idx) => (
                      <tr key={c.id}>
                        <td>{idx + 1}</td>
                        <td>{formatDate(c.firstLoanDate)}</td>
                        <td className="font-medium">{c.customerName}</td>
                        <td>{c.fatherName || '—'}</td>
                        <td>{c.aadhaar || '—'}</td>
                        <td className="max-w-[260px] truncate">{c.address || '—'}</td>
                        <td>{c.phone1 || '—'}</td>
                        <td>{c.phone2 || '—'}</td>
                        <td>{c.firstLoanNumber}</td>
                        <td className="text-right"><Money value={Number(c.firstLoanAmount) || 0} plain /></td>
                        <td className="text-right">{c.totalLoans}</td>
                        <td className="text-right font-semibold"><Money value={Number(c.totalLoanAmount) || 0} plain /></td>
                      </tr>
                    ))}
                    <tr className="bg-slate-50 font-semibold">
                      <td colSpan={9} className="text-right">Total</td>
                      <td className="text-right"><Money value={totalFirst} plain /></td>
                      <td className="text-right">{totalLoans}</td>
                      <td className="text-right"><Money value={totalLoanAmount} plain /></td>
                    </tr>
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
