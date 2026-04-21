import { NextRequest, NextResponse } from 'next/server'
import { getLoans, saveLoan, deleteLoan, getNextLoanNumber } from '@/lib/data'
import { Loan } from '@/types'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    
    // Check if requesting next loan number
    if (searchParams.get('nextNumber') === 'true') {
      const nextNumber = await getNextLoanNumber()
      return NextResponse.json({ nextLoanNumber: nextNumber })
    }
    
    const type = searchParams.get('type')
    const number = searchParams.get('number')
    
    let loans = await getLoans()
    
    if (type) {
      loans = loans.filter(loan => loan.loanType === type)
    }
    
    if (number) {
      loans = loans.filter(loan => loan.number.toString() === number || `${loan.loanType}-${loan.number}` === number)
    }
    
    return NextResponse.json(loans)
  } catch (error) {
    console.error('Error in GET /api/loans:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch loans',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const loan: Loan = await request.json()
    const saved = await saveLoan(loan)
    return NextResponse.json({ success: true, loan: saved, id: saved?.id })
  } catch (error: any) {
    console.error('Error saving loan:', error)
    return NextResponse.json({
      error: 'Failed to save loan',
      details: error.message || 'Unknown error'
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Loan ID is required' }, { status: 400 })
    }
    await deleteLoan(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete loan' }, { status: 500 })
  }
}

