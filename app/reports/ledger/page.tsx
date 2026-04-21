'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Printer, RefreshCw } from 'lucide-react'
import {
  PageHeader, Card, CardHeader, CardBody, Field, Input, Button, Money,
  StatCard, DataTable, EmptyState, Badge,
} from '@/components/ui'
import { formatDate } from '@/lib/finance'

interface AccountType { accountType: string; credit: number; debit: number; balance: number }
interface Account { aName: string; credit: number; debit: number; balance: number }
interface TransactionDetail { date: string; particulars: string; number?: string; credit: number; debit: number; balance: number }

export default function GeneralLedgerPage() {
  const router = useRouter()
  const [fromDate, setFromDate] = useState('2013-04-25')
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0])
  const [accountTypes, setAccountTypes] = useState<AccountType[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedAccountType, setSelectedAccountType] = useState<string>('')
  const [selectedAccount, setSelectedAccount] = useState<string>('')
  const [details, setDetails] = useState<TransactionDetail[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadAccountTypes()
    setSelectedAccountType(''); setSelectedAccount('')
    setAccounts([]); setDetails([])
  }, [fromDate, toDate])

  useEffect(() => {
    if (selectedAccountType) {
      loadAccounts(selectedAccountType)
      setSelectedAccount(''); setDetails([])
    } else setAccounts([])
  }, [selectedAccountType])

  useEffect(() => {
    if (selectedAccount) loadDetails(selectedAccount)
    else setDetails([])
  }, [selectedAccount])

  async function loadAccountTypes() {
    setLoading(true)
    try {
      const r = await fetch(`/api/reports/ledger/account-types?fromDate=${fromDate}&toDate=${toDate}`)
      const d = await r.json().catch(() => [])
      setAccountTypes(Array.isArray(d) ? d : [])
    } finally { setLoading(false) }
  }

  async function loadAccounts(at: string) {
    try {
      const r = await fetch(`/api/reports/ledger/accounts?accountType=${encodeURIComponent(at)}&fromDate=${fromDate}&toDate=${toDate}`)
      const d = await r.json().catch(() => [])
      setAccounts(Array.isArray(d) ? d : [])
    } catch { setAccounts([]) }
  }

  async function loadDetails(an: string) {
    try {
      const r = await fetch(`/api/reports/ledger/details?accountName=${encodeURIComponent(an)}&fromDate=${fromDate}&toDate=${toDate}`)
      const d = await r.json().catch(() => [])
      setDetails(Array.isArray(d) ? d : [])
    } catch { setDetails([]) }
  }

  const totalCredit = accountTypes.reduce((s, t) => s + (Number(t.credit) || 0), 0)
  const totalDebit = accountTypes.reduce((s, t) => s + (Number(t.debit) || 0), 0)

  return (
    <div>
      <PageHeader
        title="General Ledger"
        subtitle="Drill from account types → accounts → transaction detail"
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Reports', href: '/reports' }, { label: 'Ledger' }]}
        actions={
          <>
            <Button onClick={() => router.back()}><ArrowLeft className="w-4 h-4" />Back</Button>
            <Button onClick={loadAccountTypes}><RefreshCw className="w-4 h-4" />Refresh</Button>
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
              <StatCard label="Credits" value={<Money value={totalCredit} tone="credit" />} />
              <StatCard label="Debits" value={<Money value={totalDebit} tone="debit" />} />
            </div>
          </CardBody>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <Card>
            <CardHeader title="Account Types" subtitle={`${accountTypes.length} groups`} actions={<Badge tone={loading ? 'warn' : 'info'}>{loading ? 'Loading…' : 'Live'}</Badge>} />
            <CardBody className="!p-0">
              {accountTypes.length === 0 ? (
                <div className="p-6"><EmptyState title="No account types" /></div>
              ) : (
                <div className="overflow-x-auto">
                  <DataTable className="!border-0 !rounded-none">
                    <thead>
                      <tr><th>Account type</th><th className="text-right">Credit</th><th className="text-right">Debit</th><th className="text-right">Balance</th></tr>
                    </thead>
                    <tbody>
                      {accountTypes.map((t, i) => (
                        <tr
                          key={i}
                          onClick={() => setSelectedAccountType(t.accountType)}
                          className={`cursor-pointer ${selectedAccountType === t.accountType ? 'bg-indigo-50' : ''}`}
                        >
                          <td className="font-medium">{t.accountType}</td>
                          <td className="text-right"><Money value={Number(t.credit) || 0} tone="credit" plain /></td>
                          <td className="text-right"><Money value={Number(t.debit) || 0} tone="debit" plain /></td>
                          <td className="text-right"><Money value={Number(t.balance) || 0} plain /></td>
                        </tr>
                      ))}
                    </tbody>
                  </DataTable>
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Accounts" subtitle={selectedAccountType || 'Select an account type'} />
            <CardBody className="!p-0">
              {accounts.length === 0 ? (
                <div className="p-6"><EmptyState title={selectedAccountType ? 'No accounts' : 'Pick an account type'} /></div>
              ) : (
                <div className="overflow-x-auto">
                  <DataTable className="!border-0 !rounded-none">
                    <thead>
                      <tr><th>Account</th><th className="text-right">Credit</th><th className="text-right">Debit</th><th className="text-right">Balance</th></tr>
                    </thead>
                    <tbody>
                      {accounts.map((a, i) => (
                        <tr
                          key={i}
                          onClick={() => setSelectedAccount(a.aName)}
                          className={`cursor-pointer ${selectedAccount === a.aName ? 'bg-indigo-50' : ''}`}
                        >
                          <td className="font-medium">{a.aName}</td>
                          <td className="text-right"><Money value={Number(a.credit) || 0} tone="credit" plain /></td>
                          <td className="text-right"><Money value={Number(a.debit) || 0} tone="debit" plain /></td>
                          <td className="text-right"><Money value={Number(a.balance) || 0} plain /></td>
                        </tr>
                      ))}
                    </tbody>
                  </DataTable>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        <Card className="print-card">
          <CardHeader title="Transaction Details" subtitle={selectedAccount ? `${selectedAccount} · ${details.length} rows` : 'Select an account'} />
          <CardBody className="!p-0">
            {details.length === 0 ? (
              <div className="p-6"><EmptyState title={selectedAccount ? 'No details' : 'Pick an account to drill down'} /></div>
            ) : (
              <div className="overflow-x-auto">
                <DataTable className="!border-0 !rounded-none">
                  <thead>
                    <tr><th>Date</th><th>Particulars</th><th>No.</th><th className="text-right">Credit</th><th className="text-right">Debit</th><th className="text-right">Balance</th></tr>
                  </thead>
                  <tbody>
                    {details.map((d, i) => (
                      <tr key={i}>
                        <td>{formatDate(d.date)}</td>
                        <td className="max-w-[380px] truncate">{d.particulars}</td>
                        <td>{d.number || '—'}</td>
                        <td className="text-right"><Money value={Number(d.credit) || 0} tone="credit" plain /></td>
                        <td className="text-right"><Money value={Number(d.debit) || 0} tone="debit" plain /></td>
                        <td className="text-right"><Money value={Number(d.balance) || 0} plain /></td>
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
  )
}
