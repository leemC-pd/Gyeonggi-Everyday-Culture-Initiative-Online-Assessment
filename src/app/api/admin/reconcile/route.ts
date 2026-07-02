import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getInstrument } from '@/lib/instruments'
import { calculate } from '@/lib/scoring'
import type { InstrumentType } from '@/types'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()
  const { data: profile } = await service.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { subjectId, areaScores, reason } = await request.json()
  if (!subjectId || !areaScores) return NextResponse.json({ error: '필수 값 누락' }, { status: 400 })

  const { data: subject } = await service.from('subjects').select('instrument, stage, fiscal_year').eq('id', subjectId).single()
  if (!subject) return NextResponse.json({ error: '대상 없음' }, { status: 404 })

  const stage = subject.stage ?? subject.fiscal_year
  const instrument = getInstrument(subject.instrument as InstrumentType)

  // area_scores(기여점수)로 totalScore·grade 재계산
  const weightKey = instrument.stageWeighted && stage ? stage : 'all'
  const weights = (instrument.weights[weightKey] ?? instrument.weights[Object.keys(instrument.weights)[0]]) as Record<string, number>
  const totalScore = Object.entries(areaScores as Record<string, number>).reduce((sum, [, v]) => sum + (v ?? 0), 0)
  const grade = totalScore >= 85 ? 'A' : totalScore >= 75 ? 'B' : 'C'

  const { error } = await service.from('reconciliations').insert({
    subject_id: subjectId,
    author_id: user.id,
    area_scores: areaScores,
    total_score: Math.round(totalScore * 100) / 100,
    grade,
    reason: reason || null,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, totalScore, grade })
}
