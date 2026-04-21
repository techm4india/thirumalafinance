import { NextRequest, NextResponse } from 'next/server'
import { getGuarantors, saveGuarantor, getNextGuarantorId } from '@/lib/data'
import { getSupabaseClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Check if requesting next guarantor ID
    const searchParams = request.nextUrl.searchParams
    if (searchParams.get('nextId') === 'true') {
      const nextId = await getNextGuarantorId()
      return NextResponse.json({ nextGuarantorId: nextId })
    }
    
    const guarantors = await getGuarantors()
    return NextResponse.json(guarantors)
  } catch (error) {
    console.error('Error fetching guarantors:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch guarantors',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const guarantor = await request.json()
    await saveGuarantor(guarantor)
    
    // Fetch the saved guarantor to get the ID
    const savedGuarantors = await getGuarantors()
    const savedGuarantor = savedGuarantors.find(
      g => g.guarantorId === guarantor.guarantorId
    )
    
    if (!savedGuarantor) {
      console.error('Guarantor saved but not found in fetch:', guarantor)
      return NextResponse.json({ 
        error: 'Guarantor saved but could not retrieve ID',
        guarantor: guarantor 
      }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true, 
      guarantor: savedGuarantor,
      id: savedGuarantor.id
    })
  } catch (error: any) {
    console.error('Error saving guarantor:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to save guarantor' 
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const guarantor = await request.json()
    await saveGuarantor(guarantor)
    return NextResponse.json({ success: true, guarantor })
  } catch (error) {
    console.error('Error updating guarantor:', error)
    return NextResponse.json({ error: 'Failed to update guarantor' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Guarantor ID is required' }, { status: 400 })
    }
    const supabase = getSupabaseClient()
    const { error } = await supabase
      .from('guarantors')
      .delete()
      .eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting guarantor:', error)
    return NextResponse.json({ error: 'Failed to delete guarantor' }, { status: 500 })
  }
}

