import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

async function checkAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const service = createServiceClient()
  const { data: profile } = await service.from('profiles').select('role').eq('id', user.id).single()
  return profile?.role === 'admin' ? user : null
}

export async function POST(request: NextRequest) {
  const user = await checkAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { name, instrument, stage, fiscal_year, target_model, notes } = body
  if (!name || !instrument) return NextResponse.json({ error: '필수 값 누락' }, { status: 400 })

  const service = createServiceClient()
  const { error } = await service.from('subjects').insert({
    name,
    instrument,
    stage: stage ?? null,
    fiscal_year: fiscal_year ?? null,
    target_model: target_model ?? null,
    notes: notes ?? null,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
