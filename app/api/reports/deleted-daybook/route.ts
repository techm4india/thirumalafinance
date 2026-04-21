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
      .from('transaction_deletions')
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
    const deletedDaybook = (data || []).map((deletion: any) => ({
      id: deletion.id,
      ddate: deletion.d_date,
      nameoftheAccount: deletion.nameofthe_account || '',
      particulars: deletion.particulars || '',
      accountnumb: deletion.account_number,
    }))

    return NextResponse.json(deletedDaybook)
  } catch (error) {
    console.error('Error fetching deleted daybook records:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch deleted daybook records',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

