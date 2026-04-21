'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Printer, RefreshCw } from 'lucide-react'
import {
  PageHeader, Card, CardHeader, CardBody, Field, Input, Button, Money,
  StatCard, EmptyState, Badge,
} from '@/components/ui'

interface PartnerPerformance {
  totalLoans: number
  totalLoanAmount: number
  totalPaid: number
  commission: number
  documentCharges: number
  penalty: number
}

export default function PartnerPerformancePage() {
  const router = useRouter()
  const [partners, setPartners] = useState<string[]>([])
  const [selectedPartner, setSelectedPartner] = useState<string>('')
  const [fromDate, setFromDate] = useState('2017-05-01')
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0])
  const [toPartnerPercent, setToPartnerPercent] = useState(30)
  const [toOfficePercent, setToOfficePercent] = useState(30)
  const [performance, setPerformance] = useState<PartnerPerformance | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => { loadPartners() }, [])
  useEffect(() => { if (selectedPartner) load() }, [selectedPartner, fromDate, toDate])

  async function loadPartners() {
    try {
      const r = await fetch('/api/partners')
      const d = await r.json().catch(() => [])
      setPartners((Array.isArray(d) ? d : []).map((p: any) => p.name).filter(Boolean))
    } catch {}
  }

  async function load() {
    if (!selectedPartner) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ partner: selectedPartner, fromDate, toDate })
      const r = await fetch(`/api/reports/partner-performance?${params.toString()}`)
      const d = await r.json().catch(() => ({}))
      setPerformance(d.partnerPerformance || null)
    } finally { setLoading(false) }
  }

  return (
    <div>
      <PageHeader
        title="Partner Performance"
        subtitle="Commission, document charges, penalty, and paid split"
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Reports', href: '/reports' }, { label: 'Partner Performance' }]}
        actions={
          <>
            <Button onClick={() => router.back()}><ArrowLeft className="w-4 h-4" />Back</Button>
            <Button onClick={load} disabled={!selectedPartner || loading}><RefreshCw className="w-4 h-4" />Refresh</Button>
            <Button variant="primary" onClick={() => window.print()}><Printer className="w-4 h-4" />Print</Button>
          </>
        }
      />

      <div className="p-6 grid gap-6 lg:grid-cols-[260px_1fr]">
        <Card>
          <CardHeader title="Partners" subtitle={`${partners.length} total`} />
          <CardBody className="!p-0">
            <div className="max-h-[480px] overflow-y-auto divide-y divide-slate-100">
              {partners.length === 0 ? (
                <div className="p-4 text-sm text-slate-500">No partners</div>
              ) : partners.map((p, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedPartner(p)}
                  className={`w-full text-left px-4 py-2 text-sm ${selectedPartner === p ? 'bg-slate-900 text-white' : 'hover:bg-slate-50'}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardBody>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
                <Field label="From"><Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} /></Field>
                <Field label="To"><Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} /></Field>
                <Field label="Partner %"><Input type="number" value={toPartnerPercent} onChange={e => setToPartnerPercent(parseInt(e.target.value) || 0)} /></Field>
                <Field label="Office %"><Input type="number" value={toOfficePercent} onChange={e => setToOfficePercent(parseInt(e.target.value) || 0)} /></Field>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title={selectedPartner ? `${selectedPartner} · Performance` : 'Performance'}
              subtitle={selectedPartner || 'Pick a partner to view breakdown'}
              actions={<Badge tone={loading ? 'warn' : 'info'}>{loading ? 'Loading…' : 'Live'}</Badge>}
            />
            <CardBody>
              {!selectedPartner ? (
                <EmptyState title="Select a partner" description="Choose one from the list on the left to load KPIs." />
              ) : !performance ? (
                <EmptyState title={loading ? 'Loading…' : 'No data'} description="Nothing to show for this range." />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <StatCard label="Total loans" value={performance.totalLoans} />
                  <StatCard label="Loan amount" value={<Money value={Number(performance.totalLoanAmount) || 0} />} />
                  <StatCard label="Commission" value={<Money value={Number(performance.commission) || 0} tone="credit" />} />
                  <StatCard label="Doc charges" value={<Money value={Number(performance.documentCharges) || 0} />} />
                  <StatCard label="Penalty" value={<Money value={Number(performance.penalty) || 0} tone="debit" />} />
                  <StatCard label="Paid" value={<Money value={Number(performance.totalPaid) || 0} tone="credit" />} />
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}
