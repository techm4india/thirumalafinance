'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Trash2, Calculator as CalcIcon, Printer, RotateCcw, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { Loan, LoanType } from '@/types'
import GeneralCalculationModal from '@/components/GeneralCalculationModal'
import {
  PageHeader, Card, CardHeader, CardBody, Field, Input, Select, Textarea,
  Button, Badge, Money, DataTable,
} from '@/components/ui'
import { LEDGER_RULES, formatDate, getEffectiveRule as getLedgerRule } from '@/lib/finance'

const LOAN_TYPES: LoanType[] = ['CD', 'HP', 'STBD', 'TBD', 'FD', 'OD', 'RD']

export default function EditLoansPage() {
  const router = useRouter()
  const [loans, setLoans] = useState<Loan[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null)
  const [formData, setFormData] = useState<Partial<Loan>>({})
  const [isCalcOpen, setIsCalcOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  async function loadLoans() {
    setLoading(true)
    try {
      const r = await fetch('/api/loans', { cache: 'no-store' })
      const d = await r.json()
      setLoans(Array.isArray(d) ? d : [])
    } catch { setLoans([]) }
    finally { setLoading(false) }
  }

  useEffect(() => { loadLoans() }, [])

  function pick(loan: Loan) {
    setSelectedLoan(loan)
    setFormData({ ...loan })
    // scroll to form
    setTimeout(() => {
      document.getElementById('edit-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }

  const setField = (k: string, v: any) => setFormData(p => ({ ...p, [k]: v }))
  const setGuarantor = (n: 1 | 2, k: string, v: string) =>
    setFormData(p => ({ ...p, [`guarantor${n}`]: { ...(p[`guarantor${n}` as keyof Loan] as any || {}), [k]: v } }))

  async function handleSave() {
    if (!formData.id) return alert('Select a loan first')
    setSaving(true)
    try {
      const r = await fetch(`/api/loans/${formData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (r.ok) { alert('Loan updated'); loadLoans() }
      else { const e = await r.json().catch(() => ({})); alert(`Error: ${e.error || 'Update failed'}`) }
    } catch { alert('Network error') }
    finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!formData.id) return alert('Select a loan first')
    if (!confirm('Delete this loan? This cannot be undone.')) return
    try {
      const r = await fetch(`/api/loans?id=${formData.id}`, { method: 'DELETE' })
      if (r.ok) { alert('Deleted'); setSelectedLoan(null); setFormData({}); loadLoans() }
      else alert('Delete failed')
    } catch { alert('Network error') }
  }

  async function handleDeleteAllLoans() {
    const phrase = prompt('This will delete ALL active loans. Type DELETE ALL LOANS to confirm.')
    if (phrase !== 'DELETE ALL LOANS') return
    try {
      const r = await fetch('/api/loans?all=true', { method: 'DELETE' })
      if (r.ok) { alert('All loans deleted'); setSelectedLoan(null); setFormData({}); loadLoans() }
      else alert('Delete all loans failed')
    } catch { alert('Network error') }
  }

  const filtered = useMemo(() => {
    let list = loans
    if (typeFilter) list = list.filter(l => l.loanType === typeFilter)
    const q = filter.trim().toLowerCase()
    if (q) list = list.filter(l =>
      (l.customerName || '').toLowerCase().includes(q) ||
      String(l.number || '').includes(q) ||
      (l.aadhaar || '').includes(q)
    )
    return list
  }, [loans, filter, typeFilter])

  const rule = getLedgerRule(formData.loanType)

  return (
    <div>
      <PageHeader
        title="Edit Loans"
        subtitle={`${loans.length} total loans - click any row to edit`}
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Loans' }, { label: 'Edit' }]}
        actions={
          <>
            <Button onClick={() => router.back()}><ArrowLeft className="w-4 h-4" />Back</Button>
            <Button onClick={loadLoans} disabled={loading}><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />{loading ? 'Loading...' : 'Refresh'}</Button>
            <Button onClick={() => setIsCalcOpen(true)}><CalcIcon className="w-4 h-4" />Calculator</Button>
            {formData.id && (
              <>
                <Link href={`/loans/renew/${formData.id}`} className="inline-flex items-center gap-2 h-9 px-3 rounded-md bg-emerald-600 text-white text-sm hover:bg-emerald-700">
                  <RotateCcw className="w-4 h-4" /> Renew
                </Link>
                <Link href={`/print/loan/${formData.id}`} target="_blank" rel="noopener" className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-slate-300 bg-white text-sm text-slate-700 hover:bg-slate-50">
                  <Printer className="w-4 h-4" /> Print
                </Link>
              </>
            )}
            <Button variant="danger" onClick={handleDeleteAllLoans}><Trash2 className="w-4 h-4" />Delete All</Button>
            <Button variant="danger" onClick={handleDelete} disabled={!formData.id}><Trash2 className="w-4 h-4" />Delete</Button>
            <Button variant="primary" onClick={handleSave} disabled={!formData.id || saving}><Save className="w-4 h-4" />{saving ? 'Saving...' : 'Save'}</Button>
          </>
        }
      />

      <div className="p-6 space-y-6">
        {/* ALL LOANS TABLE */}
        <Card>
          <CardHeader
            title="All Loans"
            subtitle={loading ? 'Loading...' : `${filtered.length} of ${loans.length} loans`}
            actions={
              <div className="flex gap-2">
                <Input
                  placeholder="Filter by name, number, aadhaar..."
                  value={filter}
                  onChange={e => setFilter(e.target.value)}
                  className="w-64"
                />
                <Select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="w-28">
                  <option value="">All Types</option>
                  {LOAN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </Select>
              </div>
            }
          />
          <CardBody className="!p-0">
            {loading ? (
              <div className="p-8 text-center text-slate-500 text-sm">Loading loans...</div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">No loans found.</div>
            ) : (
              <div className="overflow-x-auto max-h-[50vh] overflow-y-auto">
                <DataTable className="!border-0 !rounded-none">
                  <thead className="sticky top-0 bg-white z-10">
                    <tr>
                      <th>#</th>
                      <th>Date</th>
                      <th>Customer Name</th>
                      <th>Type</th>
                      <th className="text-right">Amount</th>
                      <th>Rate</th>
                      <th>Period</th>
                      <th>Phone</th>
                      <th>Partner</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(l => (
                      <tr
                        key={l.id}
                        onClick={() => pick(l)}
                        className={`cursor-pointer ${selectedLoan?.id === l.id ? 'bg-indigo-50 border-l-2 border-indigo-600' : 'hover:bg-slate-50'}`}
                      >
                        <td className="font-mono text-xs">{l.number}</td>
                        <td className="text-xs">{formatDate(l.date)}</td>
                        <td className="font-medium text-slate-900">{l.customerName}</td>
                        <td><Badge tone="info">{l.loanType}</Badge></td>
                        <td className="text-right"><Money value={Number(l.loanAmount) || 0} plain /></td>
                        <td className="text-xs">{l.rateOfInterest ?? '-'}%</td>
                        <td className="text-xs">{l.period ?? '-'}d</td>
                        <td className="text-xs">{l.phone1 || '-'}</td>
                        <td className="text-xs">{l.partnerName || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </DataTable>
              </div>
            )}
          </CardBody>
        </Card>

        {/* EDIT FORM */}
        {selectedLoan && (
          <div id="edit-form" className="space-y-6">
            <Card>
              <CardHeader
                title={`Editing: Loan #${selectedLoan.number} - ${selectedLoan.customerName}`}
                subtitle={`${formatDate(selectedLoan.date)} - ${rule.label}`}
                actions={<Badge tone="info">{selectedLoan.loanType}</Badge>}
              />
              <CardBody>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                  <Field label="Date">
                    <Input type="date" value={formData.date || ''} onChange={e => setField('date', e.target.value)} />
                  </Field>
                  <Field label="Ledger Type">
                    <Select value={formData.loanType} onChange={e => setField('loanType', e.target.value as LoanType)}>
                      {LOAN_TYPES.map(t => <option key={t} value={t}>{LEDGER_RULES[t].label}</option>)}
                    </Select>
                  </Field>
                  <Field label="Loan Number">
                    <Input type="number" value={formData.number || ''} readOnly disabled />
                  </Field>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Customer Name" required>
                    <Input value={formData.customerName || ''} onChange={e => setField('customerName', e.target.value)} />
                  </Field>
                  <Field label="Father">
                    <Input value={formData.fatherName || ''} onChange={e => setField('fatherName', e.target.value)} />
                  </Field>
                  <Field label="Aadhaar">
                    <Input value={formData.aadhaar || ''} onChange={e => setField('aadhaar', e.target.value)} />
                  </Field>
                  <Field label="C.No">
                    <Input value={formData.cNo || ''} onChange={e => setField('cNo', e.target.value)} />
                  </Field>
                  <Field label="Address" className="sm:col-span-2">
                    <Input value={formData.address || ''} onChange={e => setField('address', e.target.value)} />
                  </Field>
                  <Field label="Phone 1">
                    <Input type="tel" value={formData.phone1 || ''} onChange={e => setField('phone1', e.target.value)} />
                  </Field>
                  <Field label="Phone 2">
                    <Input type="tel" value={formData.phone2 || ''} onChange={e => setField('phone2', e.target.value)} />
                  </Field>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Guarantors" />
              <CardBody className="space-y-6">
                {([1, 2] as const).map(n => (
                  <div key={n}>
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Guarantor {n}</div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <Field label="Name">
                        <Input value={(formData as any)[`guarantor${n}`]?.name || ''} onChange={e => setGuarantor(n, 'name', e.target.value)} />
                      </Field>
                      <Field label="Aadhaar">
                        <Input value={(formData as any)[`guarantor${n}`]?.aadhaar || ''} onChange={e => setGuarantor(n, 'aadhaar', e.target.value)} />
                      </Field>
                      <Field label="Phone">
                        <Input type="tel" value={(formData as any)[`guarantor${n}`]?.phone || ''} onChange={e => setGuarantor(n, 'phone', e.target.value)} />
                      </Field>
                    </div>
                  </div>
                ))}
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Loan Terms" subtitle={`Default rate ${rule.defaultRate}% / month`} />
              <CardBody>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Loan Amount (Rs.)">
                    <Input type="number" value={formData.loanAmount ?? ''} onChange={e => setField('loanAmount', Number(e.target.value) || 0)} />
                  </Field>
                  <Field label="Rate of Interest (% / month)">
                    <Input type="number" step="0.01" value={formData.rateOfInterest ?? ''} onChange={e => setField('rateOfInterest', Number(e.target.value) || 0)} />
                  </Field>
                  <Field label="Period (days)">
                    <Input type="number" value={formData.period ?? ''} onChange={e => setField('period', Number(e.target.value) || 0)} />
                  </Field>
                  <Field label="Document Charges (Rs.)">
                    <Input type="number" value={formData.documentCharges ?? ''} onChange={e => setField('documentCharges', Number(e.target.value) || 0)} />
                  </Field>
                  <Field label="Partner Name">
                    <Input value={formData.partnerName || ''} onChange={e => setField('partnerName', e.target.value)} />
                  </Field>
                  <Field label="Particulars" className="sm:col-span-2">
                    <Textarea rows={2} value={formData.particulars || ''} onChange={e => setField('particulars', e.target.value)} />
                  </Field>
                </div>
              </CardBody>
            </Card>

            <div className="flex gap-3 justify-end pb-6">
              <Button variant="danger" onClick={handleDelete}><Trash2 className="w-4 h-4" />Delete This Loan</Button>
              <Button variant="primary" onClick={handleSave} disabled={saving}><Save className="w-4 h-4" />{saving ? 'Saving...' : 'Save Changes'}</Button>
            </div>
          </div>
        )}
      </div>

      <GeneralCalculationModal isOpen={isCalcOpen} onClose={() => setIsCalcOpen(false)} />
    </div>
  )
}
