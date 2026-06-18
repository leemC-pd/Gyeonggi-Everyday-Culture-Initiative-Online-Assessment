import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getAreaName, AREA_CODES } from '@/lib/instruments'
import AssignmentManager from './AssignmentManager'
import type { InstrumentType } from '@/types'

const INSTRUMENT_LABELS: Record<InstrumentType, string> = {
  platform_foundation: '플랫폼 — 기초재단',
  platform_org: '플랫폼 — 유관기관·단체',
  private_space_foundation: '민간공간 — 기초재단',
}

interface PageProps {
  params: Promise<{ subjectId: string }>
}

export default async function SubjectDetailPage({ params }: PageProps) {
  const { subjectId } = await params
  const supabase = await createClient()

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
      evaluations ( status, total_score, grade, area_scores )
    `)
    .eq('subject_id', subjectId)

  // 모든 위원 목록 (배정 추가용)
  const { data: evaluators } = await supabase
    .from('profiles')
    .select('id, name, email')
    .eq('role', 'evaluator')
    .order('name')

  const stage = subject.stage ?? subject.fiscal_year
  type AssignmentRow = {
    id: string
    profiles: { id: string; name: string; email: string }
    evaluations: { status: string; total_score: number | null; grade: string | null; area_scores: Record<string, number> | null } | null
  }
  const rows = (assignments ?? []) as unknown as AssignmentRow[]
  const assignedIds = rows.map(a => a.profiles?.id)

  return (
    <div className="max-w-3xl">
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/subjects" className="text-gray-400 hover:text-gray-600 text-sm">← 목록</Link>
        <div>
          <h1 className="text-xl font-bold text-gray-800">{subject.name}</h1>
          <p className="text-sm text-gray-500">
            {INSTRUMENT_LABELS[subject.instrument as InstrumentType]}
            {stage && <span className="ml-2">· {stage}</span>}
            {subject.target_model && <span className="ml-2">· {subject.target_model}</span>}
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
    </div>
  )
}
