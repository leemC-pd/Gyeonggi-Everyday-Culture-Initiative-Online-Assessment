import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getConfig } from '@/lib/instruments'
import { getInstrumentWithOverrides } from '@/lib/instrumentOverrides'
import { calculate } from '@/lib/scoring'
import EvaluationForm from './EvaluationForm'
import type { InstrumentType, TargetModel, ScoringResult } from '@/types'

interface PageProps {
  params: Promise<{ assignmentId: string }>
}

export default async function EvaluatePage({ params }: PageProps) {
  const { assignmentId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // assignment + subject
  const service = createServiceClient()
  const { data: assignment } = await service
    .from('assignments')
    .select('id, evaluator_id, subjects(id, name, instrument, stage, fiscal_year, target_model)')
    .eq('id', assignmentId)
    .single()

  if (!assignment) notFound()
  if (assignment.evaluator_id !== user.id) redirect('/')

  const subject = (assignment as unknown as {
    subjects: {
      name: string
      instrument: InstrumentType
      stage: string | null
      fiscal_year: string | null
      target_model: TargetModel | null
    }
  }).subjects

  const instrument = await getInstrumentWithOverrides(subject.instrument)
  const stage = subject.stage ?? subject.fiscal_year

  // 기존 평가·응답
  const { data: evaluation } = await service
    .from('evaluations')
    .select('id, status, area_scores, total_score, grade')
    .eq('assignment_id', assignmentId)
    .single()

  let initialResponses: Record<string, number | null> = {}
  let initialQualitative: Record<string, string> = {}

  if (evaluation) {
    const { data: responses } = await service
      .from('responses')
      .select('item_code, score, qualitative')
      .eq('evaluation_id', evaluation.id)

    for (const r of responses ?? []) {
      if (r.item_code.startsWith('qual_')) {
        const areaCode = r.item_code.replace('qual_', '')
        initialQualitative[areaCode] = r.qualitative ?? ''
      } else {
        initialResponses[r.item_code] = r.score
      }
    }
  }

  const isSubmitted = evaluation?.status === 'submitted'
  let submittedResult: ScoringResult | null = null

  if (isSubmitted && evaluation?.area_scores) {
    // 재계산해서 result 구성 (areaAverages·itemCount 복원)
    submittedResult = calculate(instrument, stage, initialResponses)
  }

  const config = getConfig()
  const weightKey = instrument.stageWeighted && stage ? stage : 'all'
  const weights = (instrument.weights[weightKey] ?? instrument.weights['all']) as Record<string, number>

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center gap-3">
        <Link href="/" className="text-gray-400 hover:text-gray-600 text-sm">← 목록</Link>
        <div>
          <h1 className="font-bold text-gray-800">{subject.name}</h1>
          <p className="text-xs text-gray-500">
            {instrument.name}
            {stage && <span className="ml-2">· {stage}</span>}
            {isSubmitted && <span className="ml-2 text-green-600 font-medium">제출완료</span>}
          </p>
        </div>
      </header>

      {/* 산식·배점 안내 */}
      <div className="max-w-3xl mx-auto px-4 pt-4">
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-xs text-amber-700">
          채점: (원점수−1)÷6×100 → 영역 평균 × 배점÷100 → 합산 (만점 100) / 등급컷: A &gt;85점, B &gt;75점, 그 외 C
          {stage && (
            <span className="ml-2">
              | 배점: {Object.entries(weights).map(([k,v]) => `${k}:${v}`).join(' ')}
            </span>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        <EvaluationForm
          assignmentId={assignmentId}
          instrument={instrument}
          stage={stage}
          targetModel={subject.target_model}
          initialEvaluationId={evaluation?.id ?? null}
          initialResponses={initialResponses}
          initialQualitative={initialQualitative}
          isSubmitted={isSubmitted}
          submittedResult={submittedResult}
          submittedAreaScores={(evaluation?.area_scores as Record<string, number>) ?? null}
        />
      </div>
    </main>
  )
}
