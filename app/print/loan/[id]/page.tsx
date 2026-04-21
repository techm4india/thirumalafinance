'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Printer } from 'lucide-react'
import type { Loan } from '@/types'
import LoanSheet from '@/components/print/LoanSheet'
import { Button } from '@/components/ui'

export default function PrintLoanPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [loan, setLoan] = useState<Loan | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const r = await fetch(`/api/loans/${params.id}`)
        if (r.ok) {
          const d = await r.json()
          setLoan(d)
        }
      } finally { setLoading(false) }
    }
    if (params?.id) load()
  }, [params?.id])

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
          <div className="max-w-[230mm] mx-auto rounded-md bg-white p-8 text-slate-500">Loading loan…</div>
        ) : loan ? (
          <LoanSheet loan={loan} />
        ) : (
          <div className="max-w-[230mm] mx-auto rounded-md bg-white p-8 text-rose-600">
            Loan not found.
          </div>
        )}
      </div>
    </div>
  )
}
