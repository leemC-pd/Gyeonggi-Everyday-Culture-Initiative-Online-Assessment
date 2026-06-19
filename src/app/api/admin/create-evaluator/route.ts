import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const headers = {
  'apikey': ANON_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
}

export async function POST(request: NextRequest) {
  console.log('create-evaluator POST called')
  const { name, email } = await request.json()
  if (!name || !email) return NextResponse.json({ error: '이름과 이메일을 입력해주세요' }, { status: 400 })

  // 중복 확인
  const checkRes = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}&select=id`,
    { headers }
  )
  const existing = await checkRes.json()
  if (existing?.length > 0) return NextResponse.json({ error: '이미 등록된 이메일입니다' }, { status: 400 })

  // auth 사용자 생성
  const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ email, email_confirm: true, user_metadata: { name } }),
  })
  const createData = await createRes.json()
  console.log('createUser response:', createRes.status, JSON.stringify(createData).slice(0, 200))

  if (!createRes.ok || !createData.id) {
    return NextResponse.json({ error: createData.message ?? createData.error ?? '사용자 생성 실패' }, { status: 500 })
  }

  // 프로필 생성
  const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
    method: 'POST',
    headers: { ...headers, 'Prefer': 'return=minimal' },
    body: JSON.stringify({ id: createData.id, email, name, role: 'evaluator' }),
  })

  if (!profileRes.ok) {
    const err = await profileRes.text()
    console.log('profile insert error:', err)
    return NextResponse.json({ error: '프로필 생성 실패: ' + err }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
