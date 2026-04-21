'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Printer } from 'lucide-react'
import {
  PageHeader, Card, CardHeader, CardBody, Field, Input, Button, Money,
  StatCard, DataTable, EmptyState, Badge,
} from '@/components/ui'
import { formatDate } from '@/lib/finance'

interface BusinessSummary {
  partnerName: string
  totalLoan: number
  totalPaid: number
  balanceWith: number
  actualLoan: number
  actualPaid: number
  balanceWithout: number
}

interface GeneralBusiness {
  date: string
  number: string
  name: string
  loan: number
  paid: number
  balance: number
}

interface Outstanding {
  date: string
  dueDate: string
  number: string
  loan: number
  paid: number
  balance: number
  days: number
}

interface MDDetails {
  name: string
  actualLoan: number
  actualPaid: number
  actualBalance: number
  totalLoan: number
  totalPaid: number
  totalBalance: number
}

export default function BusinessDetailsPage() {
  const router = useRouter()
  const [fromDate, setFromDate] = useState('2013-04-25')
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedPartner, setSelectedPartner] = useState<string>('')
  const [mdDetails, setMdDetails] = useState<MDDetails>({
    name: '',
    actualLoan: 0,
    actualPaid: 0,
    actualBalance: 0,
    totalLoan: 0,
    totalPaid: 0,
    totalBalance: 0,
  })
  const [totalBusiness, setTotalBusiness] = useState<BusinessSummary[]>([])
  const [generalBusiness, setGeneralBusiness] = useState<GeneralBusiness[]>([])
  const [outstanding, setOutstanding] = useState<Outstanding[]>([])
  const [partners, setPartners] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => { loadPartners() }, [])
  useEffect(() => { load() }, [fromDate, toDate, selectedPartner])

  async function loadPartners() {
    try {
      const r = await fetch('/api/partners')
      const d = await r.json().catch(() => [])
      const names = (Array.isArray(d) ? d : []).map((p: any) => p.name).filter(Boolean)
      setPartners(names)
      if (!selectedPartner && names.length) setSelectedPartner(names[0])
    } catch {}
  }

  async function load() {
    setLoading(true)
    try {
      const qs = new URLSearchParams()
      qs.append('fromDate', fromDate)
      qs.append('toDate', toDate)
      if (selectedPartner) qs.append('partner', selectedPartner)
      const r = await fetch(`/api/reports/business?${qs.toString()}`)
      const d = await r.json().catch(() => ({}))
      setTotalBusiness(d.totalBusiness || [])
      setGeneralBusiness(d.generalBusiness || [])
      setOutstanding(d.outstanding || [])
      if (d.mdDetails) setMdDetails(d.mdDetails)
    } finally { setLoading(false) }
  }

  return (
    <div>
      <PageHeader
        title="Business Details"
        subtitle="Partner-wise & MD business, outstanding, and disbursal activity"
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Reports', href: '/reports' }, { label: 'Business' }]}
        actions={
          <>
            <Button onClick={() => router.back()}><ArrowLeft className="w-4 h-4" />Back</Button>
            <Button variant="primary" onClick={() => window.print()}><Printer className="w-4 h-4" />Print</Button>
          </>
        }
      />

      <div className="p-6 space-y-6">
        <Card>
          <CardBody>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
              <Field label="From"><Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} /></Field>
              <Field label="To"><Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} /></Field>
              <StatCard label="Partners" value={partners.length} />
              <StatCard label="Selected" value={selectedPartner || '—'} />
            </div>
          </CardBody>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <Card>
            <CardHeader title="Partners" subtitle={`${partners.length} total`} />
            <CardBody className="!p-0">
              <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
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
              <CardHeader title="MD" subtitle={mdDetails.name || 'Master business summary'} />
              <CardBody>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <StatCard label="Actual loan" value={<Money value={mdDetails.actualLoan} />} />
                  <StatCard label="Actual paid" value={<Money value={mdDetails.actualPaid} tone="credit" />} />
                  <StatCard label="Actual balance" value={<Money value={mdDetails.actualBalance} tone="debit" />} />
                  <StatCard label="Total loan" value={<Money value={mdDetails.totalLoan} />} />
                  <StatCard label="Total paid" value={<Money value={mdDetails.totalPaid} tone="credit" />} />
                  <StatCard label="Total balance" value={<Money value={mdDetails.totalBalance} tone="debit" />} />
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Total Business" subtitle="Partner-wise totals" actions={<Badge tone="info">{totalBusiness.length} rows</Badge>} />
              <CardBody className="!p-0">
                {totalBusiness.length === 0 ? (
                  <div className="p-6"><EmptyState title={loading ? 'Loading…' : 'No business data'} /></div>
                ) : (
                  <div className="overflow-x-auto">
                    <DataTable className="!border-0 !rounded-none">
                      <thead>
                        <tr>
                          <th>Partner</th>
                          <th className="text-right">Total loan</th>
                          <th className="text-right">Total paid</th>
                          <th className="text-right">Balance (with)</th>
                          <th className="text-right">Actual loan</th>
                          <th className="text-right">Actual paid</th>
                          <th className="text-right">Balance (without)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {totalBusiness.map((b, i) => (
                          <tr key={i}>
                            <td className="font-medium">{b.partnerName}</td>
                            <td className="text-right"><Money value={Number(b.totalLoan) || 0} plain /></td>
                            <td className="text-right"><Money value={Number(b.totalPaid) || 0} tone="credit" plain /></td>
                            <td className="text-right"><Money value={Number(b.balanceWith) || 0} tone="debit" plain /></td>
                            <td className="text-right"><Money value={Number(b.actualLoan) || 0} plain /></td>
                            <td className="text-right"><Money value={Number(b.actualPaid) || 0} tone="credit" plain /></td>
                            <td className="text-right"><Money value={Number(b.balanceWithout) || 0} tone="debit" plain /></td>
                          </tr>
                        ))}
                      </tbody>
                    </DataTable>
                  </div>
                )}
              </CardBody>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader title={`${selectedPartner || 'Partner'} · Business`} subtitle={`${generalBusiness.length} rows`} />
                <CardBody className="!p-0">
                  {generalBusiness.length === 0 ? (
                    <div className="p-6"><EmptyState title="No business" /></div>
                  ) : (
                    <div className="overflow-x-auto">
                      <DataTable className="!border-0 !rounded-none">
                        <thead>
                          <tr><th>Date</th><th>Number</th><th>Name</th>
                            <th className="text-right">Loan</th><th className="text-right">Paid</th><th className="text-right">Balance</th></tr>
                        </thead>
                        <tbody>
                          {generalBusiness.map((b, i) => (
                            <tr key={i}>
                              <td>{formatDate(b.date)}</td>
                              <td>{b.number}</td>
                              <td className="font-medium">{b.name}</td>
                              <td className="text-right"><Money value={Number(b.loan) || 0} plain /></td>
                              <td className="text-right"><Money value={Number(b.paid) || 0} tone="credit" plain /></td>
                              <td className="text-right"><Money value={Number(b.balance) || 0} tone="debit" plain /></td>
                            </tr>
                          ))}
                        </tbody>
                      </DataTable>
                    </div>
                  )}
                </CardBody>
              </Card>

              <Card>
                <CardHeader title={`${selectedPartner || 'Partner'} · Outstanding`} subtitle={`${outstanding.length} rows`} />
                <CardBody className="!p-0">
                  {outstanding.length === 0 ? (
                    <div className="p-6"><EmptyState title="No outstanding" /></div>
                  ) : (
                    <div className="overflow-x-auto">
                      <DataTable className="!border-0 !rounded-none">
                        <thead>
                          <tr><th>Date</th><th>Due</th><th>Number</th>
                            <th className="text-right">Loan</th><th className="text-right">Paid</th>
                            <th className="text-right">Balance</th><th className="text-right">Days</th></tr>
                        </thead>
                        <tbody>
                          {outstanding.map((o, i) => (
                            <tr key={i}>
                              <td>{formatDate(o.date)}</td>
                              <td>{formatDate(o.dueDate)}</td>
                              <td>{o.number}</td>
                              <td className="text-right"><Money value={Number(o.loan) || 0} plain /></td>
                              <td className="text-right"><Money value={Number(o.paid) || 0} tone="credit" plain /></td>
                              <td className="text-right"><Money value={Number(o.balance) || 0} tone="debit" plain /></td>
                              <td className="text-right">{o.days}</td>
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
      </div>
    </div>
  )
}
