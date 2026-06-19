import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(request: NextRequest) {
  const { name, email } = await request.json()
  if (!name || !email) return NextResponse.json({ error: '이름과 이메일을 입력해주세요' }, { status: 400 })

  const supabase = createServiceClient()

  // 이미 존재하는지 확인
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (existing) return NextResponse.json({ error: '이미 등록된 이메일입니다' }, { status: 400 })

  // auth 사용자 생성
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { name },
  })

  if (authError || !authData?.user) {
    const msg = authError?.message ?? authError?.name ?? JSON.stringify(authError) ?? '사용자 생성 실패'
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  // 프로필 생성
  const { error: profileError } = await supabase.from('profiles').insert({
    id: authData.user.id,
    email,
    name,
    role: 'evaluator',
  })

  if (profileError) {
    return NextResponse.json({ error: profileError.message ?? '프로필 생성 실패' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
