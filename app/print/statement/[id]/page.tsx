'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Printer } from 'lucide-react'
import type { Loan, LedgerTransaction } from '@/types'
import StatementSheet from '@/components/print/StatementSheet'
import { Button } from '@/components/ui'

export default function PrintStatementPage() {
  const { id } = useParams<{ id: string }>()
  const q = useSearchParams()
  const router = useRouter()
  const [loan, setLoan] = useState<Loan | null>(null)
  const [txns, setTxns] = useState<LedgerTransaction[]>([])
  const [loading, setLoading] = useState(true)

  const from = q.get('from') || undefined
  const to = q.get('to') || undefined

  useEffect(() => {
    async function load() {
      try {
        const r = await fetch(`/api/loans/${id}`)
        if (r.ok) setLoan(await r.json())
        // Try to fetch transactions tagged with this loan's number / type.
        const tx = await fetch(`/api/reports/ledger/transactions?loanId=${id}`).catch(() => null)
        if (tx?.ok) setTxns((await tx.json()) || [])
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
          <StatementSheet loan={loan} transactions={txns} from={from} to={to} />
        ) : (
          <div className="max-w-[230mm] mx-auto rounded-md bg-white p-8 text-rose-600">Loan not found.</div>
        )}
      </div>
    </div>
  )
}
