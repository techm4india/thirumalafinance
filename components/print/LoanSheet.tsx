'use client'

/**
 * Print-ready loan sheet. Used both:
 *  - in the "Preview before save" dialog (read-only preview of form state), and
 *  - on the /print/loan/[id] page (fetches a saved loan by id).
 *
 * Layout is a single A4 page with:
 *   - Company header + loan meta block (number, date, type)
 *   - Customer details + optional photo
 *   - Guarantor details
 *   - Documents submitted (Financial / Original / Registration)
 *   - Location of asset / collateral
 *   - Loan terms + live calculation summary
 *   - Signature block for customer, guarantors, manager
 */

import type { Loan, LoanType } from '@/types'
import { calcGeneric, formatDate, formatINR, getEffectiveRule } from '@/lib/finance'

interface Props {
  loan: Partial<Loan>
  // Display-only extras, e.g. today's accrued interest from live preview.
  preview?: any
  /** When true, shows watermark / "PREVIEW" banner. */
  isPreview?: boolean
  /** Company header override (defaults to Tirumala Finance). */
  companyName?: string
  companyAddress?: string
  companyPhone?: string
}

export default function LoanSheet({
  loan,
  preview,
  isPreview,
  companyName = 'Tirumala Finance',
  companyAddress = 'Head Office · Andhra Pradesh, India',
  companyPhone = '+91 ______________',
}: Props) {
  const rule = getEffectiveRule(loan.loanType)
  const amount = Number(loan.loanAmount) || 0
  const rate = Number(loan.rateOfInterest) || rule.defaultRate

  // Prefer caller-supplied preview; else compute fresh.
  const calc = preview || (amount > 0 && loan.date
    ? (() => {
        try {
          return calcGeneric(loan.loanType as LoanType, {
            principal: amount,
            loanDate: loan.date!,
            rate,
            tenureMonths: Math.max(1, Math.round((Number(loan.period) || 30) / 30)),
            totalInstallments: Math.max(1, Number(loan.period) || 100),
            today: new Date(),
          } as any)
        } catch {
          return null
        }
      })()
    : null)

  return (
    <div className="loan-sheet bg-white text-slate-900 mx-auto shadow print:shadow-none"
         style={{ width: '210mm', minHeight: '297mm', padding: '16mm', boxSizing: 'border-box' }}>
      {isPreview && (
        <div className="preview-ribbon">PREVIEW</div>
      )}

      {/* Header */}
      <header className="flex items-start justify-between border-b-2 border-slate-900 pb-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{companyName}</h1>
          <p className="text-xs text-slate-600">{companyAddress}</p>
          <p className="text-xs text-slate-600">{companyPhone}</p>
        </div>
        <div className="text-right text-sm">
          <div className="font-semibold">Loan Agreement</div>
          <div className="text-xs text-slate-500">Ref: <span className="font-mono">{loan.loanType || '—'}-{loan.number ?? '—'}</span></div>
          <div className="text-xs text-slate-500">Date: {loan.date ? formatDate(loan.date) : '—'}</div>
          <div className="text-xs text-slate-500">Type: <span className="font-semibold">{rule.label}</span></div>
        </div>
      </header>

      {/* Customer block */}
      <Section title="Customer">
        <KV items={[
          ['Name', loan.customerName],
          ['Father / Spouse', loan.fatherName],
          ['Aadhaar', loan.aadhaar],
          ['C.No', loan.cNo],
          ['Phone 1', loan.phone1],
          ['Phone 2', loan.phone2],
          ['Address', loan.address, 2],
        ]} />
      </Section>

      {/* Guarantors */}
      <Section title="Guarantors">
        <div className="grid grid-cols-2 gap-4">
          <MiniPerson label="Guarantor 1" data={loan.guarantor1} />
          <MiniPerson label="Guarantor 2" data={loan.guarantor2} />
        </div>
      </Section>

      {/* Loan terms */}
      <Section title="Loan Terms">
        <KV items={[
          ['Principal', formatINR(amount)],
          ['Rate of interest', `${rate}% per month`],
          ['Tenure', periodLabel(loan)],
          ['Document charges', formatINR(Number(loan.documentCharges) || 0)],
          ['Grace period', `${rule.graceDays} days after due date`],
          ['Penal interest', `${(rule.penaltyDailyRate * 30).toFixed(2)}% / month (≈ ${rule.penaltyDailyRate.toFixed(3)}% / day)`],
          ['Particulars', loan.particulars, 2],
        ]} />
        {calc && <CalcSummary calc={calc} loanType={loan.loanType as LoanType} />}
      </Section>

      {/* Documents */}
      <Section title="Documents Submitted">
        <DocumentsTable documents={loan.documents} />
      </Section>

      {/* Location */}
      {loan.location && (loan.location.address || loan.location.pincode || loan.location.mapLink) && (
        <Section title="Collateral / Asset Location">
          <KV items={[
            ['Address', loan.location.address, 2],
            ['Village', loan.location.village],
            ['Mandal', loan.location.mandal],
            ['District', loan.location.district],
            ['State', loan.location.state],
            ['Pincode', loan.location.pincode],
            ['Landmark', loan.location.landmark, 2],
            ['Latitude', loan.location.latitude],
            ['Longitude', loan.location.longitude],
            ['Map link', loan.location.mapLink, 2],
          ]} />
        </Section>
      )}

      {/* Description */}
      {(loan.description || loan.extraFeatures) && (
        <Section title="Description / Extra Features">
          {loan.description && <p className="text-xs leading-relaxed whitespace-pre-wrap">{loan.description}</p>}
          {loan.extraFeatures && (
            <div className="mt-2">
              <div className="text-[10px] uppercase text-slate-500 tracking-wide">Extra features</div>
              <p className="text-xs leading-relaxed whitespace-pre-wrap">{loan.extraFeatures}</p>
            </div>
          )}
        </Section>
      )}

      {/* Signatures */}
      <div className="mt-8 grid grid-cols-4 gap-3 text-center text-xs">
        {['Customer', 'Guarantor 1', 'Guarantor 2', 'Manager / Authorised'].map(label => (
          <div key={label} className="pt-10 border-t border-slate-400">{label}</div>
        ))}
      </div>

      <p className="mt-6 text-[10px] text-slate-500">
        I / We hereby confirm that the information furnished above is true and accurate to the best of my / our knowledge.
        I agree to the terms, applicable rate of interest, grace period and penal interest as stated above.
      </p>

      <style jsx>{`
        .preview-ribbon {
          position: absolute;
          top: 40px;
          right: -50px;
          background: #dc2626;
          color: white;
          padding: 4px 60px;
          transform: rotate(35deg);
          font-size: 12px;
          letter-spacing: 4px;
          font-weight: 700;
          opacity: 0.85;
        }
      `}</style>
    </div>
  )
}

// ───────────────────────────────── helpers

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-3">
      <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-600 border-b border-slate-300 pb-1 mb-2">
        {title}
      </h2>
      <div>{children}</div>
    </section>
  )
}

function KV({ items }: { items: Array<[string, any, number?]> }) {
  return (
    <dl className="grid grid-cols-4 gap-x-3 gap-y-1 text-xs">
      {items.map(([k, v, span], i) => (
        <div key={i} className={span === 2 ? 'col-span-4' : 'col-span-2'}>
          <dt className="text-[10px] text-slate-500 uppercase tracking-wide">{k}</dt>
          <dd className="font-medium text-slate-900 break-words">{v || v === 0 ? v : '—'}</dd>
        </div>
      ))}
    </dl>
  )
}

function MiniPerson({ label, data }: { label: string; data?: { name?: string; aadhaar?: string; phone?: string } }) {
  return (
    <div className="border border-slate-200 rounded-md p-2">
      <div className="text-[10px] uppercase text-slate-500 tracking-wide">{label}</div>
      <div className="text-xs">
        <div><span className="text-slate-500">Name:</span> <span className="font-medium">{data?.name || '—'}</span></div>
        <div><span className="text-slate-500">Aadhaar:</span> {data?.aadhaar || '—'}</div>
        <div><span className="text-slate-500">Phone:</span> {data?.phone || '—'}</div>
      </div>
    </div>
  )
}

function DocumentsTable({ documents }: { documents?: Loan['documents'] }) {
  const sections: Array<['financial' | 'original' | 'registration', string]> = [
    ['financial', '1. Financial Documents'],
    ['original', '2. Original Documents (Land / Assets)'],
    ['registration', '3. Registration Documents (Joint registration, etc.)'],
  ]
  return (
    <div className="space-y-2">
      {sections.map(([key, title]) => {
        const list = documents?.[key] || []
        return (
          <div key={key} className="border border-slate-200 rounded-md">
            <div className="text-[11px] font-semibold bg-slate-50 px-2 py-1 border-b border-slate-200">{title}</div>
            {list.length === 0 ? (
              <p className="text-xs text-slate-500 px-2 py-1 italic">— not provided —</p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[10px] uppercase text-slate-500">
                    <th className="text-left px-2 py-1 w-6">✓</th>
                    <th className="text-left px-2 py-1">Document</th>
                    <th className="text-left px-2 py-1">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((d, i) => (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="px-2 py-1">{d.submitted ? '☑' : '☐'}</td>
                      <td className="px-2 py-1 font-medium">{d.title || '—'}</td>
                      <td className="px-2 py-1 text-slate-600">{d.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )
      })}
    </div>
  )
}

function CalcSummary({ calc, loanType }: { calc: any; loanType: LoanType }) {
  const rows: Array<[string, any]> = []
  if (loanType === 'CD' || loanType === 'OD') {
    rows.push(['Accrued interest', formatINR(calc.presentInterest)])
    rows.push(['Penalty', formatINR(calc.penalty)])
    rows.push(['Total balance', formatINR(calc.totalBalance)])
    rows.push(['For close', formatINR(calc.totalAmtForClose)])
  } else if (loanType === 'HP') {
    rows.push(['EMI', formatINR(calc.emi)])
    rows.push(['Total interest', formatINR(calc.totalInterest)])
    rows.push(['Total payable', formatINR(calc.totalPayable)])
    rows.push(['Installments', calc.installments])
  } else if (loanType === 'STBD') {
    rows.push(['Installment', formatINR(calc.installmentAmount)])
    rows.push(['Total interest', formatINR(calc.totalInterest)])
    rows.push(['Late fees', formatINR(calc.lateFees)])
    rows.push(['Total payable', formatINR(calc.totalPayable)])
  } else {
    rows.push(['Maturity amount', formatINR(calc.maturityAmount)])
    rows.push(['Due date', formatDate(calc.dueDate)])
    rows.push(['Premium earned', formatINR(calc.premium)])
  }
  return (
    <div className="mt-2 rounded-md bg-slate-50 border border-slate-200 p-2">
      <div className="text-[10px] uppercase text-slate-500 tracking-wide mb-1">Calculation summary</div>
      <dl className="grid grid-cols-4 gap-x-3 gap-y-1 text-xs">
        {rows.map(([k, v], i) => (
          <div key={i} className="col-span-2">
            <dt className="text-[10px] text-slate-500">{k}</dt>
            <dd className="font-semibold">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function periodLabel(loan: Partial<Loan>): string {
  const n = Number(loan.period) || 0
  if (!n) return '—'
  switch (loan.loanType) {
    case 'CD':
    case 'OD': return `${n} days`
    case 'HP': return `${n} months`
    case 'STBD': return `${n} instalments`
    case 'TBD':
    case 'FD':
    case 'RD': return `${Math.round(n / 30)} months`
    default: return `${n}`
  }
}
