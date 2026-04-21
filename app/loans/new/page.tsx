'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Trash2, Calculator as CalcIcon, Eye } from 'lucide-react'
import { Loan, LoanType } from '@/types'
import GeneralCalculationModal from '@/components/GeneralCalculationModal'
import LoanExtrasForm, { emptyLoanExtras, type LoanExtrasValue } from '@/components/LoanExtrasForm'
import PrintPreviewDialog from '@/components/print/PrintPreviewDialog'
import {
  PageHeader, Section, Card, CardBody, CardHeader, Field, Input, Select,
  Textarea, Button, Money, InfoGrid, Badge,
} from '@/components/ui'
import { LEDGER_RULES, calcGeneric, formatDate, getEffectiveRule as getLedgerRule } from '@/lib/finance'

const LOAN_TYPES: LoanType[] = ['CD', 'HP', 'STBD', 'TBD', 'FD', 'OD', 'RD']

export default function LoansEntryForm() {
  const router = useRouter()
  const [formData, setFormData] = useState<Partial<Loan>>({
    date: new Date().toISOString().split('T')[0],
    loanType: 'CD',
    number: 1,
  })
  const [existingLoans, setExistingLoans] = useState<Loan[]>([])
  const [isGeneralModalOpen, setIsGeneralModalOpen] = useState(false)
  const [customers, setCustomers] = useState<any[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('')
  const [partners, setPartners] = useState<any[]>([])
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>('')
  const [guarantors, setGuarantors] = useState<any[]>([])
  const [selectedG1, setSelectedG1] = useState<string>('')
  const [selectedG2, setSelectedG2] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [extras, setExtras] = useState<LoanExtrasValue>(emptyLoanExtras())
  const [previewOpen, setPreviewOpen] = useState(false)

  // ─── Effects ───────────────────────────────────────────────
  useEffect(() => {
    fetchLoans(); fetchCustomers(); fetchPartners(); fetchGuarantors(); fetchNextLoanNumber()
  }, [])

  async function fetchNextLoanNumber() {
    try {
      const r = await fetch('/api/loans?nextNumber=true')
      if (r.ok) {
        const d = await r.json()
        setFormData(p => ({ ...p, number: d.nextLoanNumber || 1 }))
      }
    } catch {}
  }
  async function fetchLoans() {
    try {
      const r = await fetch('/api/loans'); if (!r.ok) return
      const d = await r.json(); setExistingLoans(Array.isArray(d) ? d.slice(0, 5) : [])
    } catch { setExistingLoans([]) }
  }
  async function fetchCustomers() {
    try { const r = await fetch('/api/customers'); setCustomers(r.ok ? (await r.json()) || [] : []) } catch { setCustomers([]) }
  }
  async function fetchPartners() {
    try { const r = await fetch('/api/partners'); setPartners(r.ok ? (await r.json()) || [] : []) } catch { setPartners([]) }
  }
  async function fetchGuarantors() {
    try { const r = await fetch('/api/guarantors'); setGuarantors(r.ok ? (await r.json()) || [] : []) } catch { setGuarantors([]) }
  }

  // ─── Handlers ──────────────────────────────────────────────
  const setField = (k: keyof Loan | string, v: any) => setFormData(p => ({ ...p, [k]: v }))

  const onCustomer = (id: string) => {
    setSelectedCustomerId(id)
    const c = customers.find(x => x.id === id); if (!c) return
    setFormData(p => ({
      ...p, customerName: c.name || '', aadhaar: c.aadhaar || '', fatherName: c.father || '',
      address: c.address || '', phone1: c.phone1 || '', phone2: c.phone2 || '',
      cNo: c.customerId?.toString() || '',
    }))
  }
  const onPartner = (id: string) => {
    setSelectedPartnerId(id)
    const p = partners.find(x => x.id === id); if (!p) return
    setField('partnerId', p.id); setField('partnerName', p.name)
  }
  const onGuarantor = (which: 1 | 2, id: string) => {
    if (which === 1) setSelectedG1(id); else setSelectedG2(id)
    const g = guarantors.find(x => x.id === id); if (!g) return
    setFormData(p => ({ ...p,
      [`guarantor${which}`]: { name: g.name || '', aadhaar: g.aadhaar || '', phone: g.phone1 || '' },
    }))
  }
  const setGuarantorField = (which: 1 | 2, k: string, v: string) => {
    setFormData(p => ({ ...p,
      [`guarantor${which}`]: { ...(p[`guarantor${which}` as keyof Loan] as any || {}), [k]: v },
    }))
  }

  // ─── Live preview via calc lib ─────────────────────────────
  const rule = getLedgerRule(formData.loanType)
  const preview = useMemo(() => {
    if (!formData.loanAmount || !formData.date) return null
    try {
      return calcGeneric(formData.loanType as LoanType, {
        principal: Number(formData.loanAmount) || 0,
        loanDate: formData.date,
        rate: formData.rateOfInterest ?? rule.defaultRate,
        tenureMonths: Math.max(1, Math.round((Number(formData.period) || 30) / 30)),
        totalInstallments: Math.max(1, Number(formData.period) || 100),
        today: new Date(),
      } as any)
    } catch { return null }
  }, [formData.loanAmount, formData.date, formData.loanType, formData.rateOfInterest, formData.period, rule.defaultRate])

  // Loan object that the preview + save use.
  const buildLoan = (): Loan => ({
    number: formData.number || 1,
    date: formData.date || new Date().toISOString().split('T')[0],
    loanType: (formData.loanType || 'CD') as LoanType,
    customerName: formData.customerName || '',
    fatherName: formData.fatherName, aadhaar: formData.aadhaar, cNo: formData.cNo,
    address: formData.address || '', phone1: formData.phone1, phone2: formData.phone2,
    guarantor1: formData.guarantor1, guarantor2: formData.guarantor2,
    particulars: formData.particulars, loanAmount: formData.loanAmount || 0,
    rateOfInterest: formData.rateOfInterest, period: formData.period ?? 0,
    documentCharges: formData.documentCharges, partnerId: formData.partnerId,
    partnerName: formData.partnerName, userName: 'RAMESH',
    entryTime: new Date().toISOString(),
    documents: extras.documents,
    location: extras.location,
    description: extras.description,
    extraFeatures: extras.extraFeatures,
  })

  // ─── Save ──────────────────────────────────────────────────
  async function handleSave() {
    if (!formData.customerName?.trim()) return alert('Enter Customer Name')
    if (!formData.loanAmount || formData.loanAmount <= 0) return alert('Enter valid Loan Amount')
    if (!formData.address?.trim()) return alert('Enter Address')

    const loan = buildLoan()

    setSaving(true)
    try {
      const r = await fetch('/api/loans', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loan),
      })
      if (r.ok) {
        const saved = await r.json().catch(() => null)
        const id = saved?.loan?.id || saved?.id
        alert('Loan saved successfully!')
        setPreviewOpen(false)
        if (id) router.push(`/print/loan/${id}`); else router.push('/')
      } else {
        const e = await r.json().catch(() => ({}))
        alert(`Error: ${e.message || e.error || 'Save failed'}`)
      }
    } catch { alert('Network error while saving') }
    finally { setSaving(false) }
  }

  const handleClear = () => {
    setFormData({ date: new Date().toISOString().split('T')[0], loanType: 'CD', number: formData.number })
    setSelectedCustomerId(''); setSelectedPartnerId(''); setSelectedG1(''); setSelectedG2('')
    setExtras(emptyLoanExtras())
  }

  return (
    <div>
      <PageHeader
        title="New Loan Entry"
        subtitle="Capture a fresh disbursal — ledger-aware calculations preview live."
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Loans' }, { label: 'New' }]}
        actions={
          <>
            <Button onClick={() => router.back()}><ArrowLeft className="w-4 h-4" />Back</Button>
            <Button onClick={() => setIsGeneralModalOpen(true)}><CalcIcon className="w-4 h-4" />Calculator</Button>
            <Button onClick={() => setPreviewOpen(true)}><Eye className="w-4 h-4" />Preview / Print</Button>
            <Button variant="danger" onClick={handleClear}><Trash2 className="w-4 h-4" />Clear</Button>
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4" />{saving ? 'Saving…' : 'Save Loan'}
            </Button>
          </>
        }
      />

      <div className="p-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* 1. Basics */}
          <Card>
            <CardHeader title="Basics" subtitle="Date, type, loan number" />
            <CardBody>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Date" required>
                  <Input type="date" value={formData.date || ''} onChange={e => setField('date', e.target.value)} />
                </Field>
                <Field label="Ledger Type" required hint={rule.description}>
                  <Select value={formData.loanType} onChange={e => setField('loanType', e.target.value as LoanType)}>
                    {LOAN_TYPES.map(t => <option key={t} value={t}>{LEDGER_RULES[t].label}</option>)}
                  </Select>
                </Field>
                <Field label="Loan Number" hint="Auto-generated">
                  <Input type="number" value={formData.number || ''} readOnly disabled />
                </Field>
              </div>
            </CardBody>
          </Card>

          {/* 2. Customer */}
          <Card>
            <CardHeader title="Customer" subtitle="Select existing or enter fresh" />
            <CardBody>
              <Field label="Pick existing customer (auto-fill)" className="mb-4">
                <Select value={selectedCustomerId} onChange={e => onCustomer(e.target.value)}>
                  <option value="">— Select to auto-fill —</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.customerId} — {c.name}{c.father ? ` (${c.father})` : ''}
                    </option>
                  ))}
                </Select>
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Customer Name" required>
                  <Input value={formData.customerName || ''} onChange={e => { setField('customerName', e.target.value); setSelectedCustomerId('') }} />
                </Field>
                <Field label="Father's Name">
                  <Input value={formData.fatherName || ''} onChange={e => setField('fatherName', e.target.value)} />
                </Field>
                <Field label="Aadhaar">
                  <Input value={formData.aadhaar || ''} onChange={e => setField('aadhaar', e.target.value)} />
                </Field>
                <Field label="C.No">
                  <Input value={formData.cNo || ''} onChange={e => setField('cNo', e.target.value)} />
                </Field>
                <Field label="Address" required className="sm:col-span-2">
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

          {/* 3. Guarantors */}
          <Card>
            <CardHeader title="Guarantors" subtitle="Up to two guarantors" />
            <CardBody className="space-y-6">
              {[1, 2].map(n => (
                <div key={n}>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Guarantor {n}</div>
                  <Field label="Pick existing (auto-fill)" className="mb-3">
                    <Select
                      value={n === 1 ? selectedG1 : selectedG2}
                      onChange={e => onGuarantor(n as 1 | 2, e.target.value)}
                    >
                      <option value="">— Select to auto-fill —</option>
                      {guarantors.map(g => (
                        <option key={g.id} value={g.id}>
                          {g.guarantorId ? `${g.guarantorId} — ` : ''}{g.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Field label="Name">
                      <Input
                        value={(formData as any)[`guarantor${n}`]?.name || ''}
                        onChange={e => { setGuarantorField(n as 1 | 2, 'name', e.target.value); if (n === 1) setSelectedG1(''); else setSelectedG2('') }}
                      />
                    </Field>
                    <Field label="Aadhaar">
                      <Input
                        value={(formData as any)[`guarantor${n}`]?.aadhaar || ''}
                        onChange={e => setGuarantorField(n as 1 | 2, 'aadhaar', e.target.value)}
                      />
                    </Field>
                    <Field label="Phone">
                      <Input
                        type="tel"
                        value={(formData as any)[`guarantor${n}`]?.phone || ''}
                        onChange={e => setGuarantorField(n as 1 | 2, 'phone', e.target.value)}
                      />
                    </Field>
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>

          {/* 4. Loan Terms */}
          <Card>
            <CardHeader title="Loan Terms" subtitle={`${rule.label} — default rate ${rule.defaultRate}% / month`} />
            <CardBody>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Loan Amount (₹)" required>
                  <Input type="number" min={0} value={formData.loanAmount ?? ''} onChange={e => setField('loanAmount', Number(e.target.value) || 0)} />
                </Field>
                <Field label={`Rate of Interest (% / month)`} hint={`Default: ${rule.defaultRate}%`}>
                  <Input type="number" step="0.01" value={formData.rateOfInterest ?? ''} onChange={e => setField('rateOfInterest', Number(e.target.value) || 0)} placeholder={String(rule.defaultRate)} />
                </Field>
                <Field label="Period (days / instalments)" hint="Days for CD/OD, instalments for HP/STBD, months for TBD">
                  <Input type="number" value={formData.period ?? ''} onChange={e => setField('period', Number(e.target.value) || 0)} />
                </Field>
                <Field label="Document Charges (₹)">
                  <Input type="number" value={formData.documentCharges ?? ''} onChange={e => setField('documentCharges', Number(e.target.value) || 0)} />
                </Field>
                <Field label="Particulars" className="sm:col-span-2">
                  <Textarea rows={2} value={formData.particulars || ''} onChange={e => setField('particulars', e.target.value)} />
                </Field>
              </div>
            </CardBody>
          </Card>

          {/* 5. Partner */}
          <Card>
            <CardHeader title="Partner" subtitle="Associated partner / MD" />
            <CardBody>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Select partner">
                  <Select value={selectedPartnerId} onChange={e => onPartner(e.target.value)}>
                    <option value="">— Select partner —</option>
                    {partners.map(p => <option key={p.id} value={p.id}>{p.partnerId ? `${p.partnerId} — ` : ''}{p.name}</option>)}
                  </Select>
                </Field>
                <Field label="Partner name (override)">
                  <Input value={formData.partnerName || ''} onChange={e => { setField('partnerName', e.target.value); setSelectedPartnerId('') }} />
                </Field>
              </div>
            </CardBody>
          </Card>

          {/* 6. Documents + location + description */}
          <LoanExtrasForm value={extras} onChange={setExtras} />
        </div>

        {/* Right column — live preview */}
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Live calculation"
              subtitle={`${rule.label} — ${rule.method.replace('_', ' ')}`}
              actions={<Badge tone="info">{formData.loanType}</Badge>}
            />
            <CardBody>
              {!preview || !formData.loanAmount ? (
                <p className="text-sm text-slate-500">
                  Fill in the loan amount to see the calculation preview.
                </p>
              ) : (
                <PreviewBlock preview={preview} loanType={formData.loanType as LoanType} />
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Recent loans" subtitle="Last 5 entries" />
            <CardBody className="!p-0">
              {existingLoans.length === 0 ? (
                <p className="p-5 text-sm text-slate-500">No loans yet.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {existingLoans.map(l => (
                    <li key={l.id} className="px-5 py-3 flex items-center justify-between text-sm">
                      <div className="min-w-0">
                        <div className="font-medium text-slate-900 truncate">#{l.number} · {l.customerName}</div>
                        <div className="text-xs text-slate-500">{formatDate(l.date)} · <Badge tone="info">{l.loanType}</Badge></div>
                      </div>
                      <Money value={Number(l.loanAmount) || 0} className="shrink-0" />
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      <GeneralCalculationModal isOpen={isGeneralModalOpen} onClose={() => setIsGeneralModalOpen(false)} />

      <PrintPreviewDialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        loan={buildLoan()}
        preview={preview}
        onConfirmSave={handleSave}
        saving={saving}
      />
    </div>
  )
}

function PreviewBlock({ preview, loanType }: { preview: any; loanType: LoanType }) {
  // CD / OD
  if (loanType === 'CD' || loanType === 'OD') {
    return (
      <InfoGrid columns={2} items={[
        { label: 'Principal',         value: <Money value={preview.principal} /> },
        { label: `Rate`,              value: `${preview.rate}% / month` },
        { label: 'Period',            value: `${preview.periodDays} days` },
        { label: 'Accrued interest',  value: <Money value={preview.presentInterest} tone="debit" /> },
        { label: 'Overdue days',      value: preview.overdueDays },
        { label: 'Penalty',           value: <Money value={preview.penalty} tone="debit" /> },
        { label: 'Total balance',     value: <Money value={preview.totalBalance} tone="debit" /> },
        { label: 'Close amount',      value: <Money value={preview.totalAmtForClose} tone="debit" /> },
      ]} />
    )
  }
  // HP
  if (loanType === 'HP') {
    return (
      <InfoGrid columns={2} items={[
        { label: 'Principal',     value: <Money value={preview.principal} /> },
        { label: 'Rate',          value: `${preview.rate}% flat` },
        { label: 'Tenure',        value: `${preview.tenureMonths} months` },
        { label: 'Installments',  value: preview.installments },
        { label: 'EMI',           value: <Money value={preview.emi} /> },
        { label: 'Interest',      value: <Money value={preview.totalInterest} tone="debit" /> },
        { label: 'Total payable', value: <Money value={preview.totalPayable} tone="debit" /> },
        { label: 'Outstanding',   value: <Money value={preview.outstanding} tone="debit" /> },
      ]} />
    )
  }
  // STBD
  if (loanType === 'STBD') {
    return (
      <InfoGrid columns={2} items={[
        { label: 'Principal',        value: <Money value={preview.principal} /> },
        { label: 'Rate',             value: `${preview.rate}% / month` },
        { label: 'Installments',     value: preview.totalInstallments },
        { label: 'Each instalment',  value: <Money value={preview.installmentAmount} /> },
        { label: 'Total amount',     value: <Money value={preview.totalAmount} /> },
        { label: 'Interest',         value: <Money value={preview.totalInterest} tone="debit" /> },
        { label: 'Late fees',        value: <Money value={preview.lateFees} tone="debit" /> },
        { label: 'Total payable',    value: <Money value={preview.totalPayable} tone="debit" /> },
      ]} />
    )
  }
  // TBD / FD / RD
  return (
    <InfoGrid columns={2} items={[
      { label: 'Principal',      value: <Money value={preview.principal} /> },
      { label: 'Rate',           value: `${preview.rate}% / month` },
      { label: 'Tenure',         value: `${preview.tenureMonths} months` },
      { label: 'Elapsed',        value: `${preview.elapsedMonths} mo` },
      { label: 'Premium earned', value: <Money value={preview.premium} tone="credit" /> },
      { label: 'Maturity',       value: <Money value={preview.maturityAmount} tone="credit" /> },
      { label: 'Due date',       value: formatDate(preview.dueDate) },
      { label: 'Due amount',     value: <Money value={preview.dueAmount} tone="credit" /> },
    ]} />
  )
}
