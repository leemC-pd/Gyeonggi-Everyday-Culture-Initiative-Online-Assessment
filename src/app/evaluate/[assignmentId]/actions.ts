'use server'

import { createServiceClient } from '@/lib/supabase/service'
import { getInstrument } from '@/lib/instruments'
import { calculate } from '@/lib/scoring'
import type { InstrumentType } from '@/types'

// 평가 없으면 생성, 있으면 id 반환
export async function ensureEvaluation(assignmentId: string): Promise<string> {
  const supabase = createServiceClient()

  const { data: existing } = await supabase
    .from('evaluations')
    .select('id')
    .eq('assignment_id', assignmentId)
    .single()

  if (existing) return existing.id

  const { data, error } = await supabase
    .from('evaluations')
    .insert({ assignment_id: assignmentId, status: 'draft' })
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  return data.id
}

// 문항 응답 저장 (upsert)
export async function saveResponse(
  evaluationId: string,
  itemCode: string,
  score: number | null,
  qualitative: string | null
) {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from('responses')
    .upsert(
      { evaluation_id: evaluationId, item_code: itemCode, score, qualitative, updated_at: new Date().toISOString() },
      { onConflict: 'evaluation_id,item_code' }
    )
  if (error) throw new Error(error.message)
}

// 영역 정성 저장 — item_code를 "qual_A" 형태로 저장
export async function saveQualitative(evaluationId: string, areaCode: string, text: string) {
  await saveResponse(evaluationId, `qual_${areaCode}`, null, text)
}

// 최종 제출 — 채점 후 저장
export async function submitEvaluation(assignmentId: string, evaluationId: string) {
  const supabase = createServiceClient()

  // assignment → subject 조회
  const { data: assignment } = await supabase
    .from('assignments')
    .select('subjects(instrument, stage, fiscal_year)')
    .eq('id', assignmentId)
    .single()

  if (!assignment) throw new Error('assignment not found')
  const subject = (assignment as unknown as { subjects: { instrument: InstrumentType; stage: string | null; fiscal_year: string | null } }).subjects
  const instrument = getInstrument(subject.instrument)
  const stage = subject.stage ?? subject.fiscal_year

  // 응답 조회
  const { data: responses } = await supabase
    .from('responses')
    .select('item_code, score')
    .eq('evaluation_id', evaluationId)

  const responseMap: Record<string, number | null> = {}
  for (const r of responses ?? []) {
    if (!r.item_code.startsWith('qual_')) {
      responseMap[r.item_code] = r.score ?? null
    }
  }

  const result = calculate(instrument, stage, responseMap)

  const { error } = await supabase
    .from('evaluations')
    .update({
      status: 'submitted',
      submitted_at: new Date().toISOString(),
      area_scores: result.areaScores,
      total_score: result.totalScore,
      grade: result.grade,
      updated_at: new Date().toISOString(),
    })
    .eq('id', evaluationId)

  if (error) throw new Error(error.message)
  return result
}
