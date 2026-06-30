import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import type { InstrumentType } from '@/types'

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

  const { instrumentId, items } = await request.json()
  if (!instrumentId || !items) return NextResponse.json({ error: '필수 값 누락' }, { status: 400 })

  const service = createServiceClient()
  const { error } = await service.from('instrument_overrides').upsert({
    instrument_id: instrumentId as InstrumentType,
    items,
    updated_at: new Date().toISOString(),
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: NextRequest) {
  const user = await checkAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { instrumentId } = await request.json()
  const service = createServiceClient()
  await service.from('instrument_overrides').delete().eq('instrument_id', instrumentId)
  return NextResponse.json({ ok: true })
}
