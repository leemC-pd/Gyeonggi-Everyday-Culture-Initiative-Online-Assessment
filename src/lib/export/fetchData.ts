import { createClient } from '@/lib/supabase/server'
import { getInstrument, getAreaName, AREA_CODES } from '@/lib/instruments'
import { calculate } from '@/lib/scoring'
import type { InstrumentType } from '@/types'

export interface SubjectExportRow {
  subjectName: string
  instrument: InstrumentType
  instrumentName: string
  stage: string | null
  targetModel: string | null
  evaluatorName: string
  status: string
  areaScores: Record<string, number>       // 기여점수
  areaAverages: Record<string, number>     // 영역 평균(0~100)
  areaWeights: Record<string, number>      // 배점
  totalScore: number | null
  grade: string | null
  qualitative: Record<string, string>      // 영역코드 → 정성
  isReconciled: boolean
  reconciliationReason: string | null
}

const INSTRUMENT_LABELS: Record<InstrumentType, string> = {
  platform_foundation: '플랫폼 — 재단',
  platform_org: '플랫폼 — 단체',
  private_space_foundation: '공간활성화 — 재단',
}

export async function fetchExportData(): Promise<SubjectExportRow[]> {
  const supabase = await createClient()

  const { data: assignments } = await supabase
    .from('assignments')
    .select(`
      id,
      subjects ( id, name, instrument, stage, fiscal_year, target_model ),
      profiles ( name ),
      evaluations ( id, status, area_scores, total_score, grade )
    `)
    .order('created_at')

  // 최신 reconciliation (대상별)
  const { data: reconciliations } = await supabase
    .from('reconciliations')
    .select('subject_id, area_scores, total_score, grade, reason')
    .order('created_at', { ascending: false })

  const reconBySubject: Record<string, { area_scores: Record<string, number>; total_score: number; grade: string; reason: string | null }> = {}
  for (const r of reconciliations ?? []) {
    if (!reconBySubject[r.subject_id]) reconBySubject[r.subject_id] = r
  }

  const rows: SubjectExportRow[] = []

  for (const a of assignments ?? []) {
    const subject = (a as unknown as { subjects: { id: string; name: string; instrument: InstrumentType; stage: string | null; fiscal_year: string | null; target_model: string | null } }).subjects
    const profile = (a as unknown as { profiles: { name: string } }).profiles
    const evaluationArr = (a as unknown as { evaluations: { id: string; status: string; area_scores: Record<string, number> | null; total_score: number | null; grade: string | null }[] }).evaluations
    const evaluation = Array.isArray(evaluationArr) ? evaluationArr[0] : evaluationArr

    if (!evaluation || evaluation.status !== 'submitted') continue

    const stage = subject.stage ?? subject.fiscal_year
    const instrument = getInstrument(subject.instrument)
    const weightKey = instrument.stageWeighted && stage ? stage : 'all'
    const weights = (instrument.weights[weightKey] ?? instrument.weights['all']) as Record<string, number>

    // 응답 조회 (정성 포함)
    const { data: responses } = await supabase
      .from('responses')
      .select('item_code, score, qualitative')
      .eq('evaluation_id', evaluation.id)

    const scoreMap: Record<string, number | null> = {}
    const qualMap: Record<string, string> = {}
    for (const r of responses ?? []) {
      if (r.item_code.startsWith('qual_')) {
        qualMap[r.item_code.replace('qual_', '')] = r.qualitative ?? ''
      } else {
        scoreMap[r.item_code] = r.score
      }
    }

    const result = calculate(instrument, stage, scoreMap)
    const recon = reconBySubject[subject.id]

    rows.push({
      subjectName: subject.name,
      instrument: subject.instrument,
      instrumentName: INSTRUMENT_LABELS[subject.instrument],
      stage,
      targetModel: subject.target_model,
      evaluatorName: profile?.name ?? '',
      status: evaluation.status,
      areaScores: recon ? recon.area_scores : result.areaScores,
      areaAverages: result.areaAverages,
      areaWeights: weights,
      totalScore: recon ? recon.total_score : result.totalScore,
      grade: recon ? recon.grade : result.grade,
      qualitative: qualMap,
      isReconciled: !!recon,
      reconciliationReason: recon?.reason ?? null,
    })
  }

  return rows
}
