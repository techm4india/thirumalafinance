'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, RotateCcw } from 'lucide-react'
import {
  PageHeader, Card, CardHeader, CardBody, Field, Input, Select, Button,
} from '@/components/ui'

export default function PhoneNumbersEditPage() {
  const router = useRouter()
  const [accountNumber, setAccountNumber] = useState('')
  const [accounts, setAccounts] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    number: '', name: '', father: '', address: '',
    phone: '', guarantor: '', guarantorPhone: '',
  })

  useEffect(() => { loadAccounts() }, [])
  useEffect(() => { if (accountNumber) loadAccountDetails(accountNumber) }, [accountNumber])

  async function loadAccounts() {
    try {
      const r = await fetch('/api/loans')
      const d = await r.json().catch(() => [])
      setAccounts(Array.isArray(d) ? d : [])
    } catch {}
  }

  async function loadAccountDetails(id: string) {
    try {
      const r = await fetch(`/api/loans/${id}`)
      if (!r.ok) return
      const loan = await r.json()
      setFormData({
        number: `${loan.loanType}-${loan.number}`,
        name: loan.customerName || '',
        father: loan.fatherName || '',
        address: loan.address || '',
        phone: loan.phone1 || '',
        guarantor: loan.guarantor1?.name || '',
        guarantorPhone: loan.guarantor1?.phone || '',
      })
    } catch {}
  }

  function setField(k: string, v: string) { setFormData(p => ({ ...p, [k]: v })) }

  function reset() {
    setAccountNumber('')
    setFormData({ number: '', name: '', father: '', address: '', phone: '', guarantor: '', guarantorPhone: '' })
  }

  async function save() {
    setSaving(true)
    try {
      const r = await fetch('/api/customers/phone', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountNumber, ...formData }),
      })
      if (r.ok) { alert('Phone updated'); reset() }
      else alert('Update failed')
    } catch { alert('Update error') }
    finally { setSaving(false) }
  }

  return (
    <div>
      <PageHeader
        title="Phone Number Editor"
        subtitle="Update customer + guarantor phone numbers on existing loans"
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Reports', href: '/reports' }, { label: 'Phone Edit' }]}
        actions={<Button onClick={() => router.back()}><ArrowLeft className="w-4 h-4" />Back</Button>}
      />

      <div className="p-6">
        <Card className="max-w-4xl">
          <CardHeader title="Edit phone" subtitle="Choose an account, then update the numbers below" />
          <CardBody>
            <div className="space-y-4">
              <Field label="Account">
                <Select value={accountNumber} onChange={e => setAccountNumber(e.target.value)}>
                  <option value="">Select account</option>
                  {accounts.filter(l => l.id).map(l => (
                    <option key={l.id} value={l.id!}>
                      {l.loanType}-{l.number} — {l.customerName}
                    </option>
                  ))}
                </Select>
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Number"><Input value={formData.number} readOnly /></Field>
                <Field label="Name"><Input value={formData.name} readOnly /></Field>
                <Field label="Father"><Input value={formData.father} readOnly /></Field>
                <Field label="Address"><Input value={formData.address} readOnly /></Field>
                <Field label="Phone"><Input type="tel" value={formData.phone} onChange={e => setField('phone', e.target.value)} /></Field>
                <Field label="Guarantor"><Input value={formData.guarantor} readOnly /></Field>
                <Field label="Guarantor phone"><Input type="tel" value={formData.guarantorPhone} onChange={e => setField('guarantorPhone', e.target.value)} /></Field>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="primary" onClick={save} disabled={!accountNumber || saving}>
                  <Save className="w-4 h-4" />{saving ? 'Saving…' : 'Save'}
                </Button>
                <Button onClick={reset}><RotateCcw className="w-4 h-4" />Clear</Button>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
