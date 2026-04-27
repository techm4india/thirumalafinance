import { NextRequest, NextResponse } from 'next/server'
import { getLoans } from '@/lib/data'
import { LoanSearchResult } from '@/types'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const aadhaar = searchParams.get('aadhaar')
    const name = searchParams.get('name')
    const fromDate = searchParams.get('fromDate')
    const toDate = searchParams.get('toDate')

    const allLoans = await getLoans()

    let filteredLoans = allLoans.filter(loan => {
      if (aadhaar) {
        const matchesAadhaar =
          loan.aadhaar === aadhaar ||
          loan.guarantor1?.aadhaar === aadhaar ||
          loan.guarantor2?.aadhaar === aadhaar
        if (!matchesAadhaar) return false
      }

      if (name) {
        const nameLower = name.toLowerCase()
        const matchesName = (loan.customerName || '').toLowerCase().includes(nameLower)
        const matchesNumber = String(loan.number || '').includes(name.trim())
        const matchesLoanType = (loan.loanType || '').toLowerCase().includes(nameLower)
        if (!matchesName && !matchesNumber && !matchesLoanType) return false
      }

      if (fromDate && loan.date < fromDate) return false
      if (toDate && loan.date > toDate) return false

      return true
    })

    const runningLoans = filteredLoans

    const asGuarantor1 = allLoans.filter(loan => {
      if (fromDate && loan.date < fromDate) return false
      if (toDate && loan.date > toDate) return false
      if (aadhaar && loan.guarantor1?.aadhaar === aadhaar) return true
      if (name && loan.guarantor1?.name?.toLowerCase().includes(name.toLowerCase())) return true
      return false
    })

    const asGuarantor2 = allLoans.filter(loan => {
      if (fromDate && loan.date < fromDate) return false
      if (toDate && loan.date > toDate) return false
      if (aadhaar && loan.guarantor2?.aadhaar === aadhaar) return true
      if (name && loan.guarantor2?.name?.toLowerCase().includes(name.toLowerCase())) return true
      return false
    })

    const result: LoanSearchResult = {
      runningLoans,
      asGuarantor1,
      asGuarantor2,
      allLoans: filteredLoans,
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in GET /api/search/loans:', error)
    return NextResponse.json(
      {
        error: 'Failed to search loans',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
