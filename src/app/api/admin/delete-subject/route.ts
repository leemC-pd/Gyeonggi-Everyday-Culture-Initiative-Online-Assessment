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

  const { subjectId } = await request.json()
  if (!subjectId) return NextResponse.json({ error: 'subjectId 누락' }, { status: 400 })

  const service = createServiceClient()

  // 이 대상의 평가·응답·합의·배정을 순서대로 정리 후 대상 삭제
  const { data: assignments } = await service.from('assignments').select('id').eq('subject_id', subjectId)
  const assignmentIds = (assignments ?? []).map(a => a.id)

  if (assignmentIds.length) {
    const { data: evals } = await service.from('evaluations').select('id').in('assignment_id', assignmentIds)
    const evalIds = (evals ?? []).map(e => e.id)
    if (evalIds.length) {
      await service.from('responses').delete().in('evaluation_id', evalIds)
      await service.from('evaluations').delete().in('id', evalIds)
    }
    await service.from('assignments').delete().in('id', assignmentIds)
  }

  await service.from('reconciliations').delete().eq('subject_id', subjectId)
  const { error } = await service.from('subjects').delete().eq('id', subjectId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
