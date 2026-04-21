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
      .from('loan_deletions')
      .select('*')
      .order('deleted_at', { ascending: false })

    // Apply date filters
    if (fromDate) {
      query = query.gte('deleted_at', fromDate)
    }
    if (toDate) {
      query = query.lte('deleted_at', toDate + 'T23:59:59')
    }
    if (month) {
      const [year, monthNum] = month.split('-')
      query = query
        .gte('deleted_at', `${year}-${monthNum}-01`)
        .lt('deleted_at', `${year}-${parseInt(monthNum) + 1}-01`)
    }

    const { data, error } = await query

    if (error) throw error

    // Map to the expected format
    const deletedMembers = (data || []).map((deletion: any) => ({
      id: deletion.id,
      date: deletion.date,
      number: `${deletion.loan_type || ''}-${deletion.number || ''}`,
      name: deletion.customer_name || '',
      aadhaar: deletion.aadhaar,
      amount: parseFloat(deletion.loan_amount || 0),
      user: deletion.user_name || 'SYSTEM',
    }))

    return NextResponse.json(deletedMembers)
  } catch (error) {
    console.error('Error fetching deleted records:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch deleted records',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

