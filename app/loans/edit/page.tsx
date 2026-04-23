'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Search as SearchIcon, Trash2, Calculator as CalcIcon, Printer, RotateCcw } from 'lucide-react'
import Link from 'next/link'
import { Loan, LoanType } from '@/types'
import GeneralCalculationModal from '@/components/GeneralCalculationModal'
import {
  PageHeader, Card, CardHeader, CardBody, Field, Input, Select, Textarea,
  Button, Badge, Money, EmptyState, DataTable,
} from '@/components/ui'
import { LEDGER_RULES, formatDate, getEffectiveRule as getLedgerRule } from '@/lib/finance'

const LOAN_TYPES: LoanType[] = ['CD', 'HP', 'STBD', 'TBD', 'FD', 'OD', 'RD']

export default function EditLoansPage() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<Loan[]>([])
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null)
  const [formData, setFormData] = useState<Partial<Loan>>({})
  const [isCalcOpen, setIsCalcOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSearch() {
    if (!searchTerm.trim()) return alert('Please enter a search term')
    setLoading(true)
    try {
      const r = await fetch(`/api/search/loans?withName=${encodeURIComponent(searchTerm)}`)
      const d = await r.json()
      setSearchResults(d.loans || d.allLoans || [])
    } catch { alert('Error searching loans') }
    finally { setLoading(false) }
  }

  function pick(loan: Loan) { setSelectedLoan(loan); setFormData(loan) }

  const setField = (k: string, v: any) => setFormData(p => ({ ...p, [k]: v }))
  const setGuarantor = (n: 1 | 2, k: string, v: string) =>
    setFormData(p => ({ ...p, [`guarantor${n}`]: { ...(p[`guarantor${n}` as keyof Loan] as any || {}), [k]: v } }))

  async function handleSave() {
    if (!formData.id) return alert('Select a loan first')
    try {
      const r = await fetch(`/api/loans/${formData.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (r.ok) { alert('Loan updated'); handleSearch() }
      else { const e = await r.json().catch(() => ({})); alert(`Error: ${e.error || 'Update failed'}`) }
    } catch { alert('Network error') }
  }

  async function handleDelete() {
    if (!formData.id) return alert('Select a loan first')
    if (!confirm('Delete this loan? This cannot be undone.')) return
    try {
      const r = await fetch(`/api/loans?id=${formData.id}`, { method: 'DELETE' })
      if (r.ok) { alert('Deleted'); setSelectedLoan(null); setFormData({}); handleSearch() }
      else alert('Delete failed')
    } catch { alert('Network error') }
  }

  const rule = getLedgerRule(formData.loanType)

  return (
    <div>
      <PageHeader
        title="Edit Loans"
        subtitle="Search, review, and update existing loan records"
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Loans' }, { label: 'Edit' }]}
        actions={
          <>
            <Button onClick={() => router.back()}><ArrowLeft className="w-4 h-4" />Back</Button>
            <Button onClick={() => setIsCalcOpen(true)}><CalcIcon className="w-4 h-4" />Calculator</Button>
            {formData.id && (
              <>
                <Link href={`/loans/renew/${formData.id}`} className="inline-flex items-center gap-2 h-9 px-3 rounded-md bg-emerald-600 text-white text-sm hover:bg-emerald-700">
                  <RotateCcw className="w-4 h-4" /> Renew
                </Link>
                <Link href={`/print/loan/${formData.id}`} target="_blank" rel="noopener" className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-slate-300 bg-white text-sm text-slate-700 hover:bg-slate-50">
                  <Printer className="w-4 h-4" /> Print
                </Link>
                <Link href={`/print/statement/${formData.id}`} target="_blank" rel="noopener" className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-slate-300 bg-white text-sm text-slate-700 hover:bg-slate-50">
                  <Printer className="w-4 h-4" /> Statement
                </Link>
              </>
            )}
            <Button variant="danger" onClick={handleDelete} disabled={!formData.id}><Trash2 className="w-4 h-4" />Delete</Button>
            <Button variant="primary" onClick={handleSave} disabled={!formData.id}><Save className="w-4 h-4" />Save</Button>
          </>
        }
      />

      <div className="p-6 grid gap-6 lg:grid-cols-3">
        {/* Left — search */}
        <div className="space-y-6 lg:col-span-1">
          <Card>
            <CardHeader title="Search" subtitle="By customer name or loan number" />
            <CardBody>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. RAMESH or 104"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSearch() }}
                />
                <Button variant="primary" onClick={handleSearch} disabled={loading}>
                  <SearchIcon className="w-4 h-4" />{loading ? '…' : 'Find'}
                </Button>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Results" subtitle={`${searchResults.length} loan(s)`} />
            <CardBody className="!p-0">
              {searchResults.length === 0 ? (
                <div className="p-5 text-sm text-slate-500">No results yet — run a search above.</div>
              ) : (
                <div className="max-h-[60vh] overflow-y-auto scrollbar-thin">
                  <DataTable className="!border-0 !rounded-none">
                    <thead>
                      <tr><th>No</th><th>Date</th><th>Name</th><th>Type</th></tr>
                    </thead>
                    <tbody>
                      {searchResults.map(l => (
                        <tr
                          key={l.id}
                          onClick={() => pick(l)}
                          className={`cursor-pointer ${selectedLoan?.id === l.id ? 'bg-indigo-50' : ''}`}
                        >
                          <td>{l.number}</td>
                          <td>{formatDate(l.date)}</td>
                          <td className="truncate max-w-[180px] font-medium text-slate-900">{l.customerName}</td>
                          <td><Badge tone="info">{l.loanType}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </DataTable>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Right — edit form */}
        <div className="lg:col-span-2 space-y-6">
          {!selectedLoan ? (
            <Card>
              <CardBody>
                <EmptyState
                  title="No loan selected"
                  description="Search for a customer on the left, then tap a row to edit."
                />
              </CardBody>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader
                  title={`Loan #${selectedLoan.number} — ${selectedLoan.customerName}`}
                  subtitle={`${formatDate(selectedLoan.date)} · ${rule.label}`}
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
                  {[1, 2].map(n => (
                    <div key={n}>
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Guarantor {n}</div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Field label="Name">
                          <Input value={(formData as any)[`guarantor${n}`]?.name || ''} onChange={e => setGuarantor(n as 1 | 2, 'name', e.target.value)} />
                        </Field>
                        <Field label="Aadhaar">
                          <Input value={(formData as any)[`guarantor${n}`]?.aadhaar || ''} onChange={e => setGuarantor(n as 1 | 2, 'aadhaar', e.target.value)} />
                        </Field>
                        <Field label="Phone">
                          <Input type="tel" value={(formData as any)[`guarantor${n}`]?.phone || ''} onChange={e => setGuarantor(n as 1 | 2, 'phone', e.target.value)} />
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
                    <Field label="Loan Amount (₹)">
                      <Input type="number" value={formData.loanAmount ?? ''} onChange={e => setField('loanAmount', Number(e.target.value) || 0)} />
                    </Field>
                    <Field label="Rate of Interest (% / month)">
                      <Input type="number" step="0.01" value={formData.rateOfInterest ?? ''} onChange={e => setField('rateOfInterest', Number(e.target.value) || 0)} />
                    </Field>
                    <Field label="Period">
                      <Input type="number" value={formData.period ?? ''} onChange={e => setField('period', Number(e.target.value) || 0)} />
                    </Field>
                    <Field label="Document Charges (₹)">
                      <Input type="number" value={formData.documentCharges ?? ''} onChange={e => setField('documentCharges', Number(e.target.value) || 0)} />
                    </Field>
                    <Field label="Partner Name">
                      <Input value={formData.partnerName || ''} onChange={e => setField('partnerName', e.target.value)} />
                    </Field>
                    <Field label="Particulars" className="sm:col-span-2">
                      <Textarea rows={2} value={formData.particulars || ''} onChange={e => setField('particulars', e.target.value)} />
                    </Field>
                  </div>
                  <div className="mt-4 flex items-center gap-4 text-sm">
                    <span className="text-slate-500">Principal:</span>
                    <Money value={Number(formData.loanAmount) || 0} />
                  </div>
                </CardBody>
              </Card>
            </>
          )}
        </div>
      </div>

      <GeneralCalculationModal isOpen={isCalcOpen} onClose={() => setIsCalcOpen(false)} />
    </div>
  )
}
