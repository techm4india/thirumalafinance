import { NextRequest, NextResponse } from 'next/server'
import { getTransactions, saveTransaction, deleteTransaction, deleteTransactions } from '@/lib/data'
import { Transaction } from '@/types'

export async function GET() {
  try {
    const transactions = await getTransactions()
    return NextResponse.json(transactions)
  } catch (error) {
    console.error('GET /api/transactions:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch transactions',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const transaction: Transaction = await request.json()
    await saveTransaction(transaction)
    return NextResponse.json({ success: true, transaction })
  } catch (error: any) {
    console.error('Error saving transaction:', error)
    return NextResponse.json({ 
      error: 'Failed to save transaction',
      details: error.message || 'Unknown error'
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (id) {
      await deleteTransaction(id)
      return NextResponse.json({ success: true })
    }

    if (searchParams.get('all') === 'true') {
      await deleteTransactions({
        date: searchParams.get('date') || undefined,
        transactionType: searchParams.get('transactionType') || undefined,
      })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Transaction ID or all=true is required' }, { status: 400 })
  } catch (error: any) {
    console.error('Error deleting transaction(s):', error)
    return NextResponse.json({
      error: 'Failed to delete transaction(s)',
      details: error.message || 'Unknown error',
    }, { status: 500 })
  }
}
