import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/service'
import { getInstrumentWithOverrides } from '@/lib/instrumentOverrides'
import { getAreaName, AREA_CODES } from '@/lib/instruments'
import { calculate, itemApplies } from '@/lib/scoring'
import type { InstrumentType } from '@/types'

const INSTRUMENT_LABELS: Record<string, string> = {
  platform_foundation: '플랫폼 — 재단',
  platform_org: '플랫폼 — 단체',
  private_space_foundation: '공간활성화 — 재단',
}
const LIKERT = ['①', '②', '③', '④', '⑤', '⑥', '⑦']
const LIKERT_LABELS: Record<number, string> = {
  7: '매우 우수', 6: '우수', 5: '다소 우수', 4: '보통', 3: '다소 미흡', 2: '미흡', 1: '매우 미흡',
}

interface PageProps {
  params: Promise<{ evaluationId: string }>
}

export default async function AdminEvaluationView({ params }: PageProps) {
  const { evaluationId } = await params
  const service = createServiceClient()

  const { data: evaluation } = await service
    .from('evaluations')
    .select('id, status, assignment_id, interview_target, interview_datetime, interview_place')
    .eq('id', evaluationId)
    .single()
  if (!evaluation) notFound()

  const { data: assignment } = await service
    .from('assignments')
    .select('id, profiles(name, email), subjects(id, name, instrument, stage, fiscal_year, target_model, activity_type, history)')
    .eq('id', evaluation.assignment_id)
    .single()
  if (!assignment) notFound()

  const evaluator = (assignment as unknown as { profiles: { name: string; email: string } }).profiles
  const subject = (assignment as unknown as {
    subjects: { id: string; name: string; instrument: InstrumentType; stage: string | null; fiscal_year: string | null; target_model: string | null; activity_type: string | null; history: string | null }
  }).subjects

  const instrument = await getInstrumentWithOverrides(subject.instrument)
  const stage = subject.stage ?? subject.fiscal_year

  const { data: responses } = await service
    .from('responses')
    .select('item_code, score, qualitative, is_na')
    .eq('evaluation_id', evaluationId)

  const scores: Record<string, number | null> = {}
  const naSet = new Set<string>()
  const qual: Record<string, string> = {}
  for (const r of responses ?? []) {
    if (r.item_code.startsWith('qual_')) {
      qual[r.item_code.replace('qual_', '')] = r.qualitative ?? ''
    } else {
      scores[r.item_code] = r.score
      if (r.is_na) naSet.add(r.item_code)
    }
  }

  const result = calculate(instrument, stage, scores)
  const weightKey = instrument.stageWeighted && stage ? stage : 'all'
  const weights = (instrument.weights[weightKey] ?? instrument.weights[Object.keys(instrument.weights)[0]] ?? {}) as Record<string, number>

  const areaItems: Record<string, typeof instrument.items> = {}
  for (const item of instrument.items) {
    (areaItems[item.area] ??= []).push(item)
  }
  const activeAreas = AREA_CODES.filter(a => areaItems[a]?.length)

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/admin/subjects/${subject.id}`} className="text-gray-400 hover:text-gray-600 text-sm">← 대상 상세</Link>
        <div>
          <h1 className="text-xl font-bold text-gray-800">{subject.name}</h1>
          <p className="text-sm text-gray-500">
            {INSTRUMENT_LABELS[subject.instrument]}
            {stage && <span className="ml-2">· {stage}</span>}
            <span className="ml-2 font-medium text-gray-700">· 평가위원 {evaluator?.name}</span>
            {evaluation.status === 'submitted'
              ? <span className="ml-2 text-green-600 font-medium">제출완료</span>
              : <span className="ml-2 text-yellow-600 font-medium">임시저장</span>}
          </p>
        </div>
      </div>

      {/* 인터뷰 정보 */}
      <section className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h2 className="font-semibold text-gray-700 mb-3">인터뷰 정보</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div><p className="text-xs text-gray-500 mb-0.5">대상</p><p className="text-gray-800">{evaluation.interview_target || '—'}</p></div>
          <div><p className="text-xs text-gray-500 mb-0.5">일시</p><p className="text-gray-800">{evaluation.interview_datetime || '—'}</p></div>
          <div><p className="text-xs text-gray-500 mb-0.5">장소</p><p className="text-gray-800">{evaluation.interview_place || '—'}</p></div>
        </div>
      </section>

      {/* 영역별 문항 */}
      <div className="space-y-6">
        {activeAreas.map(areaCode => {
          const items = areaItems[areaCode] ?? []
          return (
            <section key={areaCode} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 border-b px-5 py-3 flex items-center justify-between">
                <span className="font-semibold text-gray-700">{areaCode}. {getAreaName(areaCode)}</span>
                <span className="text-xs text-gray-500">배점 {weights[areaCode] ?? 0}점 · 영역점수 {result.areaScores[areaCode]?.toFixed(1) ?? '—'}</span>
              </div>
              <div className="divide-y divide-gray-100">
                {items.map(item => {
                  const applies = itemApplies(item, stage)
                  const isNa = naSet.has(item.code)
                  const sc = scores[item.code]
                  return (
                    <div key={item.code} className="px-5 py-3">
                      <p className="text-sm text-gray-800">
                        <span className="text-xs font-mono text-gray-400 mr-2">{item.code}</span>
                        {item.text}
                      </p>
                      <p className="text-sm mt-1">
                        {!applies
                          ? <span className="text-gray-400">해당없음 — 자동 제외</span>
                          : isNa
                            ? <span className="text-gray-500">해당없음 (채점 제외)</span>
                            : sc
                              ? <span className="font-semibold text-blue-700">{LIKERT[sc - 1]} {sc}점 <span className="font-normal text-gray-500">({LIKERT_LABELS[sc]})</span></span>
                              : <span className="text-red-500">미입력</span>}
                      </p>
                    </div>
                  )
                })}
              </div>
              <div className="px-5 py-4 bg-gray-50 border-t">
                <p className="text-xs font-medium text-gray-600 mb-1">{areaCode}영역 정성 평가</p>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{qual[areaCode] || '—'}</p>
              </div>
            </section>
          )
        })}

        {/* 총평 */}
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 border-b px-5 py-3"><span className="font-semibold text-gray-700">총평</span></div>
          <div className="px-5 py-4"><p className="text-sm text-gray-800 whitespace-pre-wrap">{qual['overall'] || '—'}</p></div>
        </section>

        {/* 채점 결과 */}
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 border-b px-5 py-3"><span className="font-semibold text-gray-700">채점 결과</span></div>
          <div className="p-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b">
                  <th className="text-left pb-2">영역</th>
                  <th className="text-right pb-2">배점</th>
                  <th className="text-right pb-2">영역 평균</th>
                  <th className="text-right pb-2">기여점수</th>
                </tr>
              </thead>
              <tbody>
                {activeAreas.map(a => (
                  <tr key={a} className="border-b last:border-0">
                    <td className="py-2 text-gray-800">{a}. {getAreaName(a)}</td>
                    <td className="text-right text-gray-700 tabular-nums">{weights[a]}</td>
                    <td className="text-right text-gray-700 tabular-nums">{result.areaAverages[a]?.toFixed(1) ?? '—'}</td>
                    <td className="text-right font-medium text-gray-900 tabular-nums">{result.areaScores[a]?.toFixed(2) ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-bold">
                  <td colSpan={3} className="pt-3 text-gray-900">총점</td>
                  <td className="text-right pt-3 text-gray-900 tabular-nums">{result.totalScore.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
            <div className="mt-4 text-center">
              <span className="text-4xl font-bold text-blue-700">{result.grade}</span>
              <span className="ml-2 text-gray-500 text-sm">등급</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
