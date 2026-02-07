import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'


export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // Optional filter by product_type

    const supabase = await createClient()

    let query = supabase
      .from('store_products')
      .select('*')
      .eq('status', 'active')
      .order('display_order', { ascending: true })
      .order('name', { ascending: true })

    if (type && type !== 'all') {
      query = query.eq('product_type', type)
    }

    const { data: products, error } = await query

    if (error) {
      console.error('Error fetching products:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ products: products || [] })
  } catch (error) {
    console.error('Products fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
