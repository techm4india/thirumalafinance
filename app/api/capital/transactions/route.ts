import { NextRequest, NextResponse } from 'next/server'
import { getTransactions, saveTransaction } from '@/lib/data'
import { Transaction } from '@/types'

export async function GET() {
  try {
    // Filter capital-related transactions
    const transactions = await getTransactions()
    const capitalTransactions = transactions.filter(t => 
      t.accountName.toLowerCase().includes('capital') ||
      t.accountName.toLowerCase().includes('partner')
    )
    return NextResponse.json(capitalTransactions)
  } catch (error) {
    console.error('GET /api/capital/transactions:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch capital transactions',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    // Don't include id - let database generate UUID
    const transaction: Transaction = {
      date: data.date,
      accountName: `Capital - ${data.particulars}`,
      particulars: data.particulars,
      credit: data.credit || 0,
      debit: data.debit || 0,
      userName: 'RAMESH',
      entryTime: new Date().toISOString(),
    }
    await saveTransaction(transaction)
    return NextResponse.json({ success: true, transaction })
  } catch (error: any) {
    console.error('Error saving capital transaction:', error)
    return NextResponse.json({ 
      error: 'Failed to save capital transaction',
      details: error.message || error.toString()
    }, { status: 500 })
  }
}

