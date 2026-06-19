import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(request: NextRequest) {
  try {
    const { name, email } = await request.json()
    if (!name || !email) return NextResponse.json({ error: '이름과 이메일을 입력해주세요' }, { status: 400 })

    const supabase = createServiceClient()

    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (existing) return NextResponse.json({ error: '이미 등록된 이메일입니다' }, { status: 400 })

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { name },
    })

    console.log('createUser result:', JSON.stringify({ authData: authData?.user?.id, authError }))

    if (authError || !authData?.user) {
      return NextResponse.json({ error: String(authError?.message || authError?.status || 'createUser 실패') }, { status: 500 })
    }

    const { error: profileError } = await supabase.from('profiles').insert({
      id: authData.user.id,
      email,
      name,
      role: 'evaluator',
    })

    if (profileError) {
      return NextResponse.json({ error: String(profileError.message || 'profile insert 실패') }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('create-evaluator error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
