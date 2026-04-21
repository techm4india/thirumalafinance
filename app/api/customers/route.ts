import { NextRequest, NextResponse } from 'next/server'
import { getCustomers, saveCustomer, getNextCustomerId } from '@/lib/data'
import { getSupabaseClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Check if requesting next customer ID
    const searchParams = request.nextUrl.searchParams
    if (searchParams.get('nextId') === 'true') {
      const nextId = await getNextCustomerId()
      return NextResponse.json({ nextCustomerId: nextId })
    }
    
    const customers = await getCustomers()
    return NextResponse.json(customers)
  } catch (error) {
    console.error('Error fetching customers:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch customers',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const customer = await request.json()
    await saveCustomer(customer)
    
    // Fetch the saved customer to get the ID
    const savedCustomers = await getCustomers()
    const savedCustomer = savedCustomers.find(
      c => c.customerId === customer.customerId
    )
    
    if (!savedCustomer) {
      console.error('Customer saved but not found in fetch:', customer)
      return NextResponse.json({ 
        error: 'Customer saved but could not retrieve ID',
        customer: customer 
      }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true, 
      customer: savedCustomer,
      id: savedCustomer.id // Explicitly include ID for easier access
    })
  } catch (error: any) {
    console.error('Error saving customer:', error)
    
    // Check for DNS/network errors
    const errorMessage = error.message || ''
    const errorDetails = error.details || error.toString() || ''
    const isNetworkError = 
      errorMessage.includes('fetch failed') ||
      errorMessage.includes('ENOTFOUND') ||
      errorMessage.includes('getaddrinfo') ||
      errorDetails.includes('ENOTFOUND') ||
      errorDetails.includes('getaddrinfo')
    
    if (isNetworkError) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      return NextResponse.json({ 
        error: 'Database connection failed',
        message: `Unable to connect to Supabase database. This could mean:
1. The Supabase project URL is incorrect or the project was deleted
2. There's a network connectivity issue
3. The Supabase project is paused or unavailable

Configured URL: ${supabaseUrl ? supabaseUrl.replace(/https?:\/\//, '') : 'Not set'}

Please check:
- Your Supabase project exists and is active
- The NEXT_PUBLIC_SUPABASE_URL environment variable is correct
- Your network connection is working`,
        code: 'DATABASE_CONNECTION_ERROR'
      }, { status: 503 })
    }
    
    return NextResponse.json({ 
      error: error.message || 'Failed to save customer' 
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const customer = await request.json()
    await saveCustomer(customer) // Upsert handles both create and update
    return NextResponse.json({ success: true, customer })
  } catch (error: any) {
    console.error('Error updating customer:', error)
    
    // Check for DNS/network errors
    const errorMessage = error.message || ''
    const errorDetails = error.details || error.toString() || ''
    const isNetworkError = 
      errorMessage.includes('fetch failed') ||
      errorMessage.includes('ENOTFOUND') ||
      errorMessage.includes('getaddrinfo') ||
      errorDetails.includes('ENOTFOUND') ||
      errorDetails.includes('getaddrinfo')
    
    if (isNetworkError) {
      return NextResponse.json({ 
        error: 'Database connection failed',
        message: 'Unable to connect to Supabase database. Please check your Supabase configuration and network connection.',
        code: 'DATABASE_CONNECTION_ERROR'
      }, { status: 503 })
    }
    
    return NextResponse.json({ error: 'Failed to update customer' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 })
    }
    const supabase = getSupabaseClient()
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting customer:', error)
    return NextResponse.json({ error: 'Failed to delete customer' }, { status: 500 })
  }
}

