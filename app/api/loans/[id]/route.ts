import { NextRequest, NextResponse } from 'next/server'
import { getLoans, saveLoan } from '@/lib/data'
import { Loan } from '@/types'
export const dynamic = 'force-dynamic'


export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const loans = await getLoans()
    const loan = loans.find(l => l.id === params.id)
    
    if (!loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 })
    }
    
    return NextResponse.json(loan)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch loan' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const loan: Loan = await request.json()
    // Ensure the ID matches the route parameter
    loan.id = params.id
    await saveLoan(loan)
    return NextResponse.json({ success: true, loan })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update loan' }, { status: 500 })
  }
}

