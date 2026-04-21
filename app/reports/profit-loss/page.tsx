'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Printer, RefreshCw } from 'lucide-react'
import {
  PageHeader, Card, CardHeader, CardBody, Field, Input, Button, Money,
  StatCard, DataTable, EmptyState,
} from '@/components/ui'

interface Row { accountName: string; amount: number }

export default function ProfitLossPage() {
  const router = useRouter()
  const [from, setFrom] = useState('2013-04-25')
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10))
  const [data, setData] = useState<{ incomes: Row[]; expenses: Row[]; totalIncomes: number; totalExpenses: number; totalProfit: number; shareValue: number; eachPartnerProfit: number }>({
    incomes: [], expenses: [], totalIncomes: 0, totalExpenses: 0, totalProfit: 0, shareValue: 0, eachPartnerProfit: 0,
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => { load() }, [from, to])

  async function load() {
    setLoading(true)
    try {
      const r = await fetch(`/api/reports/profit-loss?fromDate=${from}&toDate=${to}`)
      const d = await r.json().catch(() => ({}))
      setData({
        incomes: d.incomes || [], expenses: d.expenses || [],
        totalIncomes: d.totalIncomes || 0, totalExpenses: d.totalExpenses || 0,
        totalProfit: d.totalProfit || 0, shareValue: d.shareValue || 0,
        eachPartnerProfit: d.eachPartnerProfit || 0,
      })
    } finally { setLoading(false) }
  }

  return (
    <div>
      <PageHeader
        title="Profit & Loss"
        subtitle="Income vs expenses over a date range, with per-partner share"
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Reports', href: '/reports' }, { label: 'P&L' }]}
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
              <Field label="From"><Input type="date" value={from} onChange={e => setFrom(e.target.value)} /></Field>
              <Field label="To"><Input type="date" value={to} onChange={e => setTo(e.target.value)} /></Field>
              <StatCard label="Period profit" value={<Money value={data.totalProfit} />} />
              <StatCard label="Per-partner" value={<Money value={data.eachPartnerProfit} />} />
            </div>
          </CardBody>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2 print-card">
          <Card>
            <CardHeader title="Incomes" subtitle={`${data.incomes.length} heads`} />
            <CardBody className="!p-0">
              {loading ? <div className="p-6 text-sm text-slate-500">Loading…</div> :
                data.incomes.length === 0 ? <div className="p-6"><EmptyState title="No income" /></div> :
                  <DataTable className="!border-0 !rounded-none">
                    <thead><tr><th>Head</th><th className="text-right">Amount</th></tr></thead>
                    <tbody>
                      {data.incomes.map((r, i) => (
                        <tr key={i}><td className="font-medium">{r.accountName}</td>
                          <td className="text-right"><Money value={r.amount} tone="credit" plain /></td></tr>
                      ))}
                      <tr className="bg-slate-50 font-semibold"><td className="text-right">Total</td>
                        <td className="text-right"><Money value={data.totalIncomes} tone="credit" /></td></tr>
                    </tbody>
                  </DataTable>}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Expenses" subtitle={`${data.expenses.length} heads`} />
            <CardBody className="!p-0">
              {loading ? <div className="p-6 text-sm text-slate-500">Loading…</div> :
                data.expenses.length === 0 ? <div className="p-6"><EmptyState title="No expenses" /></div> :
                  <DataTable className="!border-0 !rounded-none">
                    <thead><tr><th>Head</th><th className="text-right">Amount</th></tr></thead>
                    <tbody>
                      {data.expenses.map((r, i) => (
                        <tr key={i}><td className="font-medium">{r.accountName}</td>
                          <td className="text-right"><Money value={r.amount} tone="debit" plain /></td></tr>
                      ))}
                      <tr className="bg-slate-50 font-semibold"><td className="text-right">Total</td>
                        <td className="text-right"><Money value={data.totalExpenses} tone="debit" /></td></tr>
                    </tbody>
                  </DataTable>}
            </CardBody>
          </Card>
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          <StatCard label="Total income" value={<Money value={data.totalIncomes} tone="credit" />} />
          <StatCard label="Total expenses" value={<Money value={data.totalExpenses} tone="debit" />} />
          <StatCard label="Total profit" value={<Money value={data.totalProfit} />} />
          <StatCard label="Share value" value={<Money value={data.shareValue} />} />
        </div>
      </div>
    </div>
  )
}
