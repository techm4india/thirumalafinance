'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Printer } from 'lucide-react'
import type { Loan } from '@/types'
import ReceiptSheet from '@/components/print/ReceiptSheet'
import { Button } from '@/components/ui'

type Kind = 'disbursal' | 'payment' | 'close' | 'renewal'

export default function PrintReceiptPage() {
  const { id } = useParams<{ id: string }>()
  const q = useSearchParams()
  const router = useRouter()
  const [loan, setLoan] = useState<Loan | null>(null)
  const [loading, setLoading] = useState(true)

  const amount = Number(q.get('amount') || 0)
  const kind = (q.get('kind') || 'disbursal') as Kind
  const note = q.get('note') || undefined
  const number = q.get('number') || undefined

  useEffect(() => {
    async function load() {
      try {
        const r = await fetch(`/api/loans/${id}`)
        if (r.ok) setLoan(await r.json())
      } finally { setLoading(false) }
    }
    if (id) load()
  }, [id])

  return (
    <div className="p-4">
      <div className="max-w-[230mm] mx-auto mb-3 flex items-center justify-between no-print">
        <Button onClick={() => router.back()}><ArrowLeft className="w-4 h-4" />Back</Button>
        <Button variant="primary" onClick={() => window.print()}>
          <Printer className="w-4 h-4" />Print
        </Button>
      </div>
      <div className="print-area">
        {loading ? (
          <div className="max-w-[230mm] mx-auto rounded-md bg-white p-8 text-slate-500">Loading…</div>
        ) : loan ? (
          <ReceiptSheet loan={loan} amount={amount || Number(loan.loanAmount) || 0} kind={kind} note={note} number={number} />
        ) : (
          <div className="max-w-[230mm] mx-auto rounded-md bg-white p-8 text-rose-600">Loan not found.</div>
        )}
      </div>
    </div>
  )
}
