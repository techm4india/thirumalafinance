import { NextRequest, NextResponse } from 'next/server'
import { getTransactions, getLoans } from '@/lib/data'

export async function GET(
  request: NextRequest,
  { params }: { params: { accountId: string } }
) {
  try {
    // First, get the loan by ID
    const loans = await getLoans()
    const loan = loans.find(l => l.id === params.accountId)
    
    if (!loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 })
    }

    // Get all transactions
    const transactions = await getTransactions()
    
    // Match transactions to this loan by:
    // 1. Loan number (e.g., "CD-123" or just "123")
    // 2. Customer name in account_name
    // 3. Loan type and number combination
    const loanNumberStr = loan.number.toString()
    const loanTypeNumber = `${loan.loanType}-${loan.number}`
    
    const accountTransactions = transactions.filter(t => {
      // Match by loan number
      if (t.number === loanNumberStr || t.number === loanTypeNumber) return true
      if (t.rno === loanNumberStr || t.rno === loanTypeNumber) return true
      
      // Match by customer name in account name
      if (t.accountName && loan.customerName) {
        if (t.accountName.includes(loan.customerName)) return true
      }
      
      // Match by loan type and number in account name
      if (t.accountName && t.accountName.includes(loanTypeNumber)) return true
      if (t.accountName && t.accountName.includes(`${loan.loanType} ${loan.number}`)) return true
      
      return false
    })
    
    // Sort by date and entry time
    accountTransactions.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date)
      if (dateCompare !== 0) return dateCompare
      return a.entryTime.localeCompare(b.entryTime)
    })
    
    return NextResponse.json(accountTransactions.map(t => ({
      date: t.date,
      credit: t.credit || 0,
      debit: t.debit || 0,
      particulars: t.particulars || '',
      accountName: t.accountName || '',
      rno: t.rno || '',
    })))
  } catch (error: any) {
    console.error('Error fetching ledger:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch ledger',
      details: error?.message || 'Unknown error'
    }, { status: 500 })
  }
}

