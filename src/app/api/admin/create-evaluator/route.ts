import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    console.log('create-evaluator: start')
    const body = await request.json()
    console.log('create-evaluator body:', body)

    const { createServiceClient } = await import('@/lib/supabase/service')
    const supabase = createServiceClient()
    console.log('supabase client created')

    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', body.email)
      .maybeSingle()

    if (existing) return NextResponse.json({ error: '이미 등록된 이메일입니다' }, { status: 400 })
    console.log('existing check done')

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: body.email,
      email_confirm: true,
      user_metadata: { name: body.name },
    })

    console.log('createUser done:', authData?.user?.id, authError?.message)

    if (authError || !authData?.user) {
      return NextResponse.json({ error: authError?.message ?? 'createUser 실패' }, { status: 500 })
    }

    const { error: profileError } = await supabase.from('profiles').insert({
      id: authData.user.id,
      email: body.email,
      name: body.name,
      role: 'evaluator',
    })

    if (profileError) {
      return NextResponse.json({ error: profileError.message ?? 'profile 생성 실패' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('create-evaluator catch:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
