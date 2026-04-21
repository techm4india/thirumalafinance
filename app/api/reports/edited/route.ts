import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()
    const searchParams = request.nextUrl.searchParams
    const fromDate = searchParams.get('fromDate')
    const toDate = searchParams.get('toDate')
    const month = searchParams.get('month')

    let query = supabase
      .from('loan_edits')
      .select('*')
      .order('edited_at', { ascending: false })

    // Apply date filters
    if (fromDate) {
      query = query.gte('edited_at', fromDate)
    }
    if (toDate) {
      query = query.lte('edited_at', toDate + 'T23:59:59')
    }
    if (month) {
      const [year, monthNum] = month.split('-')
      query = query
        .gte('edited_at', `${year}-${monthNum}-01`)
        .lt('edited_at', `${year}-${parseInt(monthNum) + 1}-01`)
    }

    const { data, error } = await query

    if (error) throw error

    // Map to the expected format
    const editedMembers = (data || []).map((edit: any) => ({
      id: edit.id,
      oDate: edit.o_date,
      nDate: edit.n_date,
      oNumber: `${edit.o_loan_type || ''}-${edit.o_number || ''}`,
      nNumber: `${edit.n_loan_type || ''}-${edit.n_number || ''}`,
      oName: edit.o_customer_name || '',
      nName: edit.n_customer_name || '',
      oAdhaar: edit.o_aadhaar,
      nAdhaar: edit.n_aadhaar,
      oAmount: parseFloat(edit.o_loan_amount || 0),
      nAmount: parseFloat(edit.n_loan_amount || 0),
      user: edit.user_name || 'SYSTEM',
    }))

    return NextResponse.json(editedMembers)
  } catch (error) {
    console.error('Error fetching edited records:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch edited records',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

