'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Printer, RefreshCw } from 'lucide-react'
import {
  PageHeader, Card, CardHeader, CardBody, Field, Input, Button, Money,
  StatCard, DataTable, EmptyState, Badge,
} from '@/components/ui'

interface AccountBalance { name: string; cBalance: number; dBalance: number }

export default function FinalStatementPage() {
  const router = useRouter()
  const [fromDate, setFromDate] = useState('2013-04-25')
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0])
  const [accounts, setAccounts] = useState<AccountBalance[]>([])
  const [creditTotal, setCreditTotal] = useState(0)
  const [debitTotal, setDebitTotal] = useState(0)
  const [openingCashBalance, setOpeningCashBalance] = useState(0)
  const [closingCashBalance, setClosingCashBalance] = useState(0)
  const [capital, setCapital] = useState(0)
  const [grandTotal, setGrandTotal] = useState(0)
  const [totalPartners, setTotalPartners] = useState(4)
  const [loading, setLoading] = useState(false)

  useEffect(() => { load() }, [fromDate, toDate])

  async function load() {
    setLoading(true)
    try {
      const r = await fetch(`/api/reports/final-statement?fromDate=${fromDate}&toDate=${toDate}`)
      const d = await r.json().catch(() => ({}))
      setAccounts(d.accounts || [])
      setCreditTotal(d.creditTotal || 0)
      setDebitTotal(d.debitTotal || 0)
      setOpeningCashBalance(d.openingCashBalance || 0)
      setClosingCashBalance(d.closingCashBalance || 0)
      setCapital(d.capital || 0)
      setGrandTotal(d.grandTotal || 0)
    } finally { setLoading(false) }
  }

  const shareValue = totalPartners > 0 ? grandTotal / totalPartners : 0

  return (
    <div>
      <PageHeader
        title="Final Statement"
        subtitle="Net worth snapshot with share value for each partner"
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Reports', href: '/reports' }, { label: 'Final Statement' }]}
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
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
              <Field label="From"><Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} /></Field>
              <Field label="To"><Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} /></Field>
              <Field label="Partners"><Input type="number" value={totalPartners} onChange={e => setTotalPartners(parseInt(e.target.value) || 0)} /></Field>
              <StatCard label="Share value" value={<Money value={shareValue} />} />
            </div>
          </CardBody>
        </Card>

        <div className="grid gap-4 sm:grid-cols-4">
          <StatCard label="Credit total" value={<Money value={creditTotal} tone="credit" />} />
          <StatCard label="Debit total" value={<Money value={debitTotal} tone="debit" />} />
          <StatCard label="Opening cash" value={<Money value={openingCashBalance} />} />
          <StatCard label="Closing cash" value={<Money value={closingCashBalance} />} />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Capital" value={<Money value={capital} />} />
          <StatCard label="Grand total" value={<Money value={grandTotal} />} />
          <StatCard label="Accounts" value={accounts.length} />
        </div>

        <Card className="print-card">
          <CardHeader title="Account balances" subtitle={`${accounts.length} accounts`} actions={<Badge tone={loading ? 'warn' : 'info'}>{loading ? 'Loading…' : 'Live'}</Badge>} />
          <CardBody className="!p-0">
            {accounts.length === 0 ? (
              <div className="p-6"><EmptyState title={loading ? 'Loading…' : 'No accounts'} /></div>
            ) : (
              <div className="overflow-x-auto">
                <DataTable className="!border-0 !rounded-none">
                  <thead>
                    <tr><th>Name</th><th className="text-right">Credit balance</th><th className="text-right">Debit balance</th></tr>
                  </thead>
                  <tbody>
                    {accounts.map((a, i) => (
                      <tr key={i}>
                        <td className="font-medium">{a.name}</td>
                        <td className="text-right"><Money value={Number(a.cBalance) || 0} tone="credit" plain /></td>
                        <td className="text-right"><Money value={Number(a.dBalance) || 0} tone="debit" plain /></td>
                      </tr>
                    ))}
                    <tr className="bg-slate-50 font-semibold">
                      <td className="text-right">Total</td>
                      <td className="text-right"><Money value={creditTotal} tone="credit" /></td>
                      <td className="text-right"><Money value={debitTotal} tone="debit" /></td>
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
