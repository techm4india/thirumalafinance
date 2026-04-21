'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  FileText, Users, UserPlus, Book, DollarSign, Calculator as CalcIcon,
  Search as SearchIcon, CreditCard, Receipt, BookOpen, Calendar,
  TrendingUp, BarChart3, Wallet, AlertCircle, Edit3, ShieldCheck,
} from 'lucide-react'
import { PageHeader, Section, StatCard, Card, CardBody, CardHeader, DataTable, Badge, Money, Button, EmptyState } from '@/components/ui'
import { formatDate, calcCD } from '@/lib/finance'
import type { Loan } from '@/types'

type KPI = {
  disbursed: number
  outstanding: number
  collectedToday: number
  overdueCount: number
}

export default function DashboardPage() {
  const [loans, setLoans] = useState<Loan[]>([])
  const [txns, setTxns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    async function load() {
      setLoading(true)
      try {
        const [lr, tr] = await Promise.all([
          fetch('/api/loans').then(r => r.ok ? r.json() : []).catch(() => []),
          fetch('/api/transactions').then(r => r.ok ? r.json() : []).catch(() => []),
        ])
        if (!alive) return
        setLoans(Array.isArray(lr) ? lr : [])
        setTxns(Array.isArray(tr) ? tr : [])
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    return () => { alive = false }
  }, [])

  const kpi: KPI = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    const disbursed = loans.reduce((s, l) => s + (Number(l.loanAmount) || 0), 0)
    const outstanding = loans.reduce((s, l) => {
      // quick CD-style estimate — accurate per-ledger numbers live in each ledger page.
      if (l.loanType === 'CD' || l.loanType === 'OD') {
        const r = calcCD({
          principal: Number(l.loanAmount) || 0,
          loanDate: l.date,
          rate: l.rateOfInterest,
        })
        return s + r.totalBalance
      }
      return s + (Number(l.loanAmount) || 0)
    }, 0)
    const collectedToday = txns
      .filter((t: any) => (t.date || '').slice(0, 10) === today)
      .reduce((s: number, t: any) => s + (Number(t.debit) || 0), 0)
    const overdueCount = loans.filter((l: any) => {
      if (!l.dueDate) return false
      return new Date(l.dueDate) < new Date()
    }).length

    return { disbursed, outstanding, collectedToday, overdueCount }
  }, [loans, txns])

  const recentLoans = loans.slice(0, 8)

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Overview of today's chitfund operations"
        actions={
          <>
            <Link href="/loans/new"><Button variant="primary"><FileText className="w-4 h-4" />New Loan</Button></Link>
            <Link href="/cashbook"><Button><Book className="w-4 h-4" />Cash Book</Button></Link>
          </>
        }
      />

      <div className="p-6 space-y-8">
        {/* KPIs */}
        <Section title="Today at a glance">
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Disbursed (all-time)"
              value={<Money value={kpi.disbursed} tone="muted" className="text-slate-900" />}
              hint={`${loans.length} loans on book`}
              icon={<Wallet className="w-4 h-4" />}
              tone="neutral"
            />
            <StatCard
              label="Outstanding"
              value={<Money value={kpi.outstanding} tone="debit" />}
              hint="Principal + accrued interest"
              icon={<TrendingUp className="w-4 h-4" />}
              tone="debit"
            />
            <StatCard
              label="Collected today"
              value={<Money value={kpi.collectedToday} tone="credit" />}
              hint="Debit side of cashbook"
              icon={<DollarSign className="w-4 h-4" />}
              tone="credit"
            />
            <StatCard
              label="Overdue loans"
              value={<span className="text-amber-700">{kpi.overdueCount}</span>}
              hint="Past due date"
              icon={<AlertCircle className="w-4 h-4" />}
              tone="warn"
            />
          </div>
        </Section>

        {/* Quick actions */}
        <Section title="Quick actions">
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
            <QuickTile icon={<FileText className="w-5 h-5" />} label="New Loan" href="/loans/new" />
            <QuickTile icon={<Edit3 className="w-5 h-5" />} label="Edit Loan" href="/loans/edit" />
            <QuickTile icon={<UserPlus className="w-5 h-5" />} label="New Customer" href="/customers/new" />
            <QuickTile icon={<ShieldCheck className="w-5 h-5" />} label="New Guarantor" href="/guarantors/new" />
            <QuickTile icon={<Book className="w-5 h-5" />} label="Cash Book" href="/cashbook" />
            <QuickTile icon={<DollarSign className="w-5 h-5" />} label="Capital" href="/capital" />
            <QuickTile icon={<SearchIcon className="w-5 h-5" />} label="Search" href="/search" />
            <QuickTile icon={<CalcIcon className="w-5 h-5" />} label="Calculator" href="/calculator" />
            <QuickTile icon={<CreditCard className="w-5 h-5" />} label="CD Ledger" href="/reports/cd-ledger" />
            <QuickTile icon={<Receipt className="w-5 h-5" />} label="HP Ledger" href="/reports/hp-ledger" />
            <QuickTile icon={<Receipt className="w-5 h-5" />} label="STBD Ledger" href="/reports/stbd-ledger" />
            <QuickTile icon={<Receipt className="w-5 h-5" />} label="TBD Ledger" href="/reports/tbd-ledger" />
          </div>
        </Section>

        {/* Recent loans + reports */}
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader
              title="Recent loans"
              subtitle="Most recent 8 disbursals"
              actions={<Link href="/loans/edit" className="text-sm text-accent-700 hover:underline">View all →</Link>}
            />
            <CardBody className="!p-0">
              {loading ? (
                <div className="p-6 text-sm text-slate-500">Loading…</div>
              ) : recentLoans.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    title="No loans yet"
                    description="Start by creating your first loan entry."
                    action={<Link href="/loans/new"><Button variant="primary">Create loan</Button></Link>}
                  />
                </div>
              ) : (
                <DataTable className="!border-0 !rounded-none">
                  <thead>
                    <tr>
                      <th>#</th><th>Date</th><th>Type</th><th>Customer</th>
                      <th className="text-right">Amount</th><th>Partner</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentLoans.map((l: Loan, i: number) => (
                      <tr key={l.id ?? i}>
                        <td className="text-slate-500">{l.number}</td>
                        <td>{formatDate(l.date)}</td>
                        <td><Badge tone="info">{l.loanType}</Badge></td>
                        <td className="font-medium text-slate-900 truncate max-w-[280px]">{l.customerName}</td>
                        <td className="text-right"><Money value={Number(l.loanAmount) || 0} /></td>
                        <td className="text-slate-500 truncate max-w-[160px]">{l.partnerName || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </DataTable>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Reports" subtitle="Printable statements" />
            <CardBody className="!p-0">
              <ul className="divide-y divide-slate-100">
                {[
                  { label: 'Day Book', href: '/reports/daybook', icon: <BookOpen className="w-4 h-4" /> },
                  { label: 'Daily Report', href: '/reports/daily', icon: <Calendar className="w-4 h-4" /> },
                  { label: 'General Ledger', href: '/reports/ledger', icon: <FileText className="w-4 h-4" /> },
                  { label: 'Dues List', href: '/reports/dues', icon: <FileText className="w-4 h-4" /> },
                  { label: 'Profit & Loss', href: '/reports/profit-loss', icon: <TrendingUp className="w-4 h-4" /> },
                  { label: 'Final Statement', href: '/reports/statement', icon: <BarChart3 className="w-4 h-4" /> },
                  { label: 'Business Details', href: '/reports/business', icon: <BarChart3 className="w-4 h-4" /> },
                  { label: 'Partner Performance', href: '/reports/partner-performance', icon: <Users className="w-4 h-4" /> },
                ].map(r => (
                  <li key={r.href}>
                    <Link href={r.href} className="flex items-center gap-3 px-5 py-3 text-sm text-slate-700 hover:bg-slate-50">
                      <span className="text-slate-400">{r.icon}</span>
                      <span>{r.label}</span>
                      <span className="ml-auto text-slate-300">→</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}

function QuickTile({ icon, label, href }: { icon: React.ReactNode; label: string; href: string }) {
  return (
    <Link
      href={href}
      className="group app-card !shadow-none hover:!shadow-card transition p-4 flex flex-col items-start gap-2"
    >
      <div className="h-9 w-9 rounded-lg bg-slate-900 text-white grid place-items-center group-hover:bg-indigo-600 transition-colors">
        {icon}
      </div>
      <div className="text-sm font-medium text-slate-900">{label}</div>
    </Link>
  )
}
