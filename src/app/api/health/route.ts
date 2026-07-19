import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

// Supabase 무료 플랜 자동 일시정지 방지용 헬스체크.
// Vercel Cron이 하루 1회 호출 → 가벼운 쿼리로 DB를 깨움.
export async function GET() {
  try {
    const service = createServiceClient()
    const { error } = await service.from('profiles').select('id').limit(1)
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, at: new Date().toISOString() })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
