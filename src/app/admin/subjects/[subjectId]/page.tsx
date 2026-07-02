import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServiceClient as createClient } from '@/lib/supabase/service'
import { getAreaName, getInstrument, AREA_CODES } from '@/lib/instruments'
import AssignmentManager from './AssignmentManager'
import ReconcileForm from './ReconcileForm'
import SubjectStageEditor from './SubjectStageEditor'
import type { InstrumentType } from '@/types'

const INSTRUMENT_LABELS: Record<InstrumentType, string> = {
  platform_foundation: '플랫폼 — 기초재단',
  platform_org: '플랫폼 — 유관기관·단체',
  private_space_foundation: '공간활성화 — 기초재단',
}

interface PageProps {
  params: Promise<{ subjectId: string }>
}

export default async function SubjectDetailPage({ params }: PageProps) {
  const { subjectId } = await params
  const supabase = createClient()

  const { data: subject } = await supabase
    .from('subjects')
    .select('*')
    .eq('id', subjectId)
    .single()

  if (!subject) notFound()

  // 배정된 위원 + 평가 상태
  const { data: assignments } = await supabase
    .from('assignments')
    .select(`
      id,
      profiles ( id, name, email ),
      evaluations ( id, status, total_score, grade, area_scores )
    `)
    .eq('subject_id', subjectId)

  // 모든 위원 목록 (배정 추가용)
  const { data: evaluators } = await supabase
    .from('profiles')
    .select('id, name, email')
    .eq('role', 'evaluator')
    .order('name')

  const stage = subject.stage ?? subject.fiscal_year

  // 합의점수 (최신)
  const { data: reconciliations } = await supabase
    .from('reconciliations')
    .select('area_scores, total_score, grade, reason, created_at')
    .eq('subject_id', subjectId)
    .order('created_at', { ascending: false })
    .limit(1)
  const latestRecon = reconciliations?.[0] ?? null

  // 이 진단지의 활성 영역 코드
  const instrument = getInstrument(subject.instrument as InstrumentType)
  const areaItemCodes = [...new Set(instrument.items.map(i => i.area))]
  const activeAreaCodes = AREA_CODES.filter(a => areaItemCodes.includes(a))

  type AssignmentRow = {
    id: string
    profiles: { id: string; name: string; email: string }
    evaluations: { id: string; status: string; total_score: number | null; grade: string | null; area_scores: Record<string, number> | null } | null
  }
  const rows = (assignments ?? []) as unknown as AssignmentRow[]
  const assignedIds = rows.map(a => a.profiles?.id)

  // 제출된 평가의 위원별 원점수 → 문항 편차 플래그
  const submittedEvals = rows
    .map(a => {
      const ev = Array.isArray(a.evaluations) ? a.evaluations[0] : a.evaluations
      return ev?.status === 'submitted' ? { evalId: ev.id, name: a.profiles?.name ?? '?' } : null
    })
    .filter((x): x is { evalId: string; name: string } => x !== null)

  const deviationEvaluators = submittedEvals.map(e => e.name)
  const deviationRows: {
    code: string; no: number; area: string; text: string
    scores: (number | null)[]; diff: number | null; flagged: boolean; priority: boolean
  }[] = []

  if (submittedEvals.length >= 2) {
    const { data: allResponses } = await supabase
      .from('responses')
      .select('evaluation_id, item_code, score')
      .in('evaluation_id', submittedEvals.map(e => e.evalId))

    // evalId → (item_code → score)
    const byEval: Record<string, Record<string, number | null>> = {}
    for (const r of allResponses ?? []) {
      if (r.item_code.startsWith('qual_')) continue
      ;(byEval[r.evaluation_id] ??= {})[r.item_code] = r.score
    }

    for (const item of instrument.items) {
      const scores = submittedEvals.map(e => byEval[e.evalId]?.[item.code] ?? null)
      const present = scores.filter((s): s is number => s != null)
      const diff = present.length >= 2 ? Math.max(...present) - Math.min(...present) : null
      deviationRows.push({
        code: item.code, no: item.no, area: item.area, text: item.text,
        scores,
        diff,
        flagged: diff != null && diff >= 2,
        priority: item.area === 'C' || item.area === 'D',
      })
    }
  }

  return (
    <div className="max-w-3xl">
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/subjects" className="text-gray-400 hover:text-gray-600 text-sm">← 목록</Link>
        <div>
          <h1 className="text-xl font-bold text-gray-800">{subject.name}</h1>
          <p className="text-sm text-gray-500 flex items-center flex-wrap gap-1">
            {INSTRUMENT_LABELS[subject.instrument as InstrumentType]}
            {subject.instrument !== 'private_space_foundation' && (
              <span className="ml-1">·
                <SubjectStageEditor
                  subjectId={subjectId}
                  currentStage={subject.stage ?? null}
                  instrument={subject.instrument}
                />
              </span>
            )}
            {subject.target_model && <span className="ml-2">· {subject.target_model}</span>}
            {subject.activity_type && <span className="ml-2">· {subject.activity_type}</span>}
            {subject.history && <span className="ml-2">· {subject.history}</span>}
          </p>
        </div>
      </div>

      {/* 위원 배정 */}
      <section className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h2 className="font-semibold text-gray-700 mb-4">위원 배정</h2>
        <AssignmentManager
          subjectId={subjectId}
          assignments={rows}
          evaluators={(evaluators ?? []).filter(e => !assignedIds.includes(e.id))}
        />
      </section>

      {/* 합의점수 입력 (제출된 위원이 있을 때) */}
      {rows.some(a => {
        const ev = Array.isArray(a.evaluations) ? a.evaluations[0] : a.evaluations
        return ev?.status === 'submitted'
      }) && (
        <section className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-700">관리자 합의점수</h2>
            {latestRecon && (
              <span className="text-xs text-gray-400">
                최종 저장: {new Date(latestRecon.created_at).toLocaleDateString('ko-KR')} —
                총점 {Number(latestRecon.total_score).toFixed(2)}점 / {latestRecon.grade}등급
              </span>
            )}
          </div>
          <ReconcileForm
            subjectId={subjectId}
            areaCodes={activeAreaCodes}
            existingScores={latestRecon?.area_scores as Record<string, number> | null}
            existingReason={latestRecon?.reason ?? null}
          />
        </section>
      )}

      {/* 위원별 점수 비교 (제출된 경우) */}
      {rows.some(a => {
        const ev = Array.isArray(a.evaluations) ? a.evaluations[0] : a.evaluations
        return ev?.status === 'submitted'
      }) && (
        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-700 mb-4">위원별 영역 점수 비교</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-gray-500 border-b">
                <tr>
                  <th className="text-left pb-2">위원</th>
                  {AREA_CODES.map(a => (
                    <th key={a} className="text-right pb-2 px-2">{a}<br/>{getAreaName(a)}</th>
                  ))}
                  <th className="text-right pb-2 px-2">총점</th>
                  <th className="text-right pb-2">등급</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.filter(a => {
                  const ev = Array.isArray(a.evaluations) ? a.evaluations[0] : a.evaluations
                  return ev?.status === 'submitted'
                }).map((a, i) => (
                  <tr key={i}>
                    <td className="py-2 font-medium">{a.profiles?.name}</td>
                    {AREA_CODES.map(code => {
                      const ev = Array.isArray(a.evaluations) ? a.evaluations[0] : a.evaluations
                      return (
                        <td key={code} className="text-right py-2 px-2 text-gray-600">
                          {ev?.area_scores?.[code]?.toFixed(1) ?? '—'}
                        </td>
                      )
                    })}
                    {(() => {
                      const ev = Array.isArray(a.evaluations) ? a.evaluations[0] : a.evaluations
                      return (
                        <>
                          <td className="text-right py-2 px-2 font-semibold">
                            {ev?.total_score != null ? Number(ev.total_score).toFixed(1) : '—'}
                          </td>
                          <td className="text-right py-2 font-bold text-blue-700">{ev?.grade ?? '—'}</td>
                        </>
                      )
                    })()}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 문항별 위원 간 편차 (원점수 차 ≥2점 자동 표시) */}
      {deviationRows.length > 0 && (
        <section className="bg-white rounded-xl border border-gray-200 p-5 mt-6">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-semibold text-gray-700">문항별 위원 간 편차</h2>
            <span className="text-xs text-gray-400">
              조정대상 {deviationRows.filter(r => r.flagged).length}문항
            </span>
          </div>
          <p className="text-xs text-gray-500 mb-4">
            동일 문항에서 위원 간 원점수 차이가 <b>2점 이상</b>이면 조정대상으로 표시됩니다.
            다양성(C)·개방성(D) 문항은 우선 감시 대상입니다.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-gray-500 border-b">
                <tr>
                  <th className="text-left pb-2 pr-2">문항</th>
                  {deviationEvaluators.map((n, i) => (
                    <th key={i} className="text-center pb-2 px-2 whitespace-nowrap">{n}</th>
                  ))}
                  <th className="text-center pb-2 px-2">편차</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {deviationRows.map(r => (
                  <tr key={r.code} className={r.flagged ? (r.priority ? 'bg-red-50' : 'bg-amber-50') : ''}>
                    <td className="py-2 pr-2 align-top">
                      <span className="text-xs font-mono text-gray-400 mr-1">{r.no}.{r.area}</span>
                      <span className="text-gray-700">{r.text}</span>
                      {r.flagged && r.priority && (
                        <span className="ml-1 text-[10px] font-bold text-red-600">우선</span>
                      )}
                    </td>
                    {r.scores.map((s, i) => (
                      <td key={i} className="text-center py-2 px-2 text-gray-600">
                        {s != null ? ['①','②','③','④','⑤','⑥','⑦'][s-1] : '—'}
                      </td>
                    ))}
                    <td className={`text-center py-2 px-2 font-semibold ${r.flagged ? (r.priority ? 'text-red-600' : 'text-amber-600') : 'text-gray-400'}`}>
                      {r.diff != null ? r.diff : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
