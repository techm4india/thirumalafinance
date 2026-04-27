import { NextRequest, NextResponse } from 'next/server'
import { getTransactions, getLoans } from '@/lib/data'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { accountId: string } }
) {
  try {
    const loans = await getLoans()
    const loan = loans.find(l => l.id === params.accountId)
    if (!loan) return NextResponse.json({ error: 'Loan not found' }, { status: 404 })

    const transactions = await getTransactions()
    const loanNumberStr = loan.number.toString()
    const loanTypeNumber = `${loan.loanType}-${loan.number}`
    const loanTypeNumberSpace = `${loan.loanType} ${loan.number}`
    const customerNameLower = (loan.customerName || '').toLowerCase()

    const accountTransactions = transactions.filter(t => {
      const tNumber = (t.number || '').toString().trim()
      const tRno = (t.rno || '').toString().trim()
      const tAccount = (t.accountName || '').toLowerCase()
      const tParticulars = (t.particulars || '').toLowerCase()
      if (tNumber === loanNumberStr) return true
      if (tRno === loanNumberStr) return true
      if (tNumber === loanTypeNumber) return true
      if (tRno === loanTypeNumber) return true
      if (tAccount.includes(loanTypeNumber.toLowerCase())) return true
      if (tAccount.includes(loanTypeNumberSpace.toLowerCase())) return true
      if (tParticulars.includes(loanTypeNumber.toLowerCase())) return true
      if (tParticulars.includes(loanTypeNumberSpace.toLowerCase())) return true
      if (customerNameLower && tAccount.includes(customerNameLower)) return true
      if (tRno.includes(loanTypeNumber)) return true
      if (tNumber.includes(loanTypeNumber)) return true
      return false
    })

    accountTransactions.sort((a, b) => {
      const dc = (a.date || '').localeCompare(b.date || '')
      return dc !== 0 ? dc : (a.entryTime || '').localeCompare(b.entryTime || '')
    })

    let balance = 0
    const rows = accountTransactions.map(t => {
      balance += (Number(t.credit) || 0) - (Number(t.debit) || 0)
      return {
        id: (t as any).id || '',
        date: t.date,
        credit: t.credit || 0,
        debit: t.debit || 0,
        particulars: t.particulars || '',
        accountName: t.accountName || '',
        rno: t.rno || '',
        balance,
      }
    })

    return NextResponse.json(rows)
  } catch (error: any) {
    console.error('Error fetching ledger:', error)
    return NextResponse.json({ error: 'Failed to fetch ledger', details: error?.message || 'Unknown error' }, { status: 500 })
  }
}
