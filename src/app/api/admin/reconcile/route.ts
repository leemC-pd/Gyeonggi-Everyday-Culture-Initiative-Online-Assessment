import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getInstrumentWithOverrides } from '@/lib/instrumentOverrides'
import { calculate } from '@/lib/scoring'
import type { InstrumentType } from '@/types'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()
  const { data: profile } = await service.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { subjectId, itemScores, reason } = await request.json()
  if (!subjectId || !itemScores) return NextResponse.json({ error: '필수 값 누락' }, { status: 400 })

  const { data: subject } = await service.from('subjects').select('instrument, stage, fiscal_year').eq('id', subjectId).single()
  if (!subject) return NextResponse.json({ error: '대상 없음' }, { status: 404 })

  const stage = subject.stage ?? subject.fiscal_year
  const instrument = await getInstrumentWithOverrides(subject.instrument as InstrumentType)

  // 문항 원점수(7점) → 산식으로 영역점수·총점·등급 계산
  const responseMap: Record<string, number | null> = {}
  for (const [code, v] of Object.entries(itemScores as Record<string, number | null>)) {
    responseMap[code] = (v === null || v === undefined || Number.isNaN(Number(v))) ? null : Number(v)
  }
  const result = calculate(instrument, stage, responseMap)

  const { error } = await service.from('reconciliations').insert({
    subject_id: subjectId,
    author_id: user.id,
    item_scores: itemScores,
    area_scores: result.areaScores,
    total_score: Math.round(result.totalScore * 100) / 100,
    grade: result.grade,
    reason: reason || null,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, totalScore: result.totalScore, grade: result.grade })
}
