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

  const { subjectId, presurveyUrl } = await request.json()
  if (!subjectId) return NextResponse.json({ error: 'subjectId 누락' }, { status: 400 })

  const url = (presurveyUrl ?? '').trim()
  if (url && !/^https?:\/\//i.test(url)) {
    return NextResponse.json({ error: 'http:// 또는 https:// 로 시작하는 주소를 입력하세요.' }, { status: 400 })
  }

  const service = createServiceClient()
  const { error } = await service
    .from('subjects')
    .update({ presurvey_url: url || null, updated_at: new Date().toISOString() })
    .eq('id', subjectId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
