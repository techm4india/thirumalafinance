'use client'

/**
 * Full-screen modal that shows the loan print sheet before saving, so the
 * admin can review exactly what the customer will see / sign.
 */

import { X, Printer } from 'lucide-react'
import type { Loan } from '@/types'
import LoanSheet from './LoanSheet'

export default function PrintPreviewDialog({
  open,
  onClose,
  loan,
  preview,
  onConfirmSave,
  saving,
}: {
  open: boolean
  onClose: () => void
  loan: Partial<Loan>
  preview?: any
  onConfirmSave?: () => void
  saving?: boolean
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 overflow-y-auto print:bg-white print:static print:overflow-visible">
      <div className="max-w-[230mm] mx-auto my-6 print:my-0">
        {/* Toolbar — hidden on print */}
        <div className="flex items-center justify-between bg-white rounded-t-md px-3 py-2 shadow no-print">
          <div className="text-sm font-semibold text-slate-900">Loan print preview</div>
          <div className="flex items-center gap-2">
            {onConfirmSave && (
              <button
                onClick={onConfirmSave}
                disabled={saving}
                className="inline-flex items-center gap-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium px-3 py-1.5 disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Confirm & save'}
              </button>
            )}
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1 rounded-md bg-slate-900 text-white text-xs font-medium px-3 py-1.5"
            >
              <Printer className="w-3.5 h-3.5" /> Print
            </button>
            <button
              onClick={onClose}
              className="inline-flex items-center gap-1 rounded-md bg-white border border-slate-300 text-slate-700 text-xs font-medium px-3 py-1.5"
            >
              <X className="w-3.5 h-3.5" /> Close
            </button>
          </div>
        </div>

        {/* Sheet */}
        <div className="relative print-area">
          <LoanSheet loan={loan} preview={preview} isPreview={true} />
        </div>
      </div>
    </div>
  )
}
