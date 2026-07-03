import { createServiceClient as createClient } from '@/lib/supabase/service'
import type { InstrumentType } from '@/types'

const INSTRUMENT_LABELS: Record<InstrumentType, string> = {
  platform_foundation: '플랫폼·재단',
  platform_org: '플랫폼·단체',
  private_space_foundation: '공간활성화',
}

const STATUS_BADGE = {
  none:      { label: '미시작',   color: 'bg-gray-100 text-gray-600' },
  draft:     { label: '임시저장', color: 'bg-yellow-100 text-yellow-700' },
  submitted: { label: '제출완료', color: 'bg-green-100 text-green-700' },
}

export default async function ProgressPage() {
  const supabase = createClient()

  const { data: subjects } = await supabase
    .from('subjects')
    .select(`
      id, name, instrument, stage, fiscal_year,
      assignments (
        id,
        profiles ( name ),
        evaluations ( status, total_score, grade )
      )
    `)
    .order('instrument')
    .order('name')

  type SubjectRow = {
    id: string
    name: string
    instrument: string
    stage: string | null
    fiscal_year: string | null
    assignments: {
      id: string
      profiles: { name: string }
      evaluations: { status: string; total_score: number | null; grade: string | null } | null
    }[]
  }
  const subjectRows = (subjects ?? []) as unknown as SubjectRow[]

  // 요약 통계
  let total = 0, started = 0, submitted = 0
  for (const s of subjectRows) {
    for (const a of s.assignments ?? []) {
      const ev = Array.isArray(a.evaluations) ? a.evaluations[0] : a.evaluations
      total++
      if (ev?.status === 'draft') started++
      if (ev?.status === 'submitted') submitted++
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-800 mb-2">진행상황</h1>

      {/* 요약 바 */}
      <div className="flex gap-4 text-sm mb-6">
        <span className="text-gray-500">전체 <b className="text-gray-800">{total}</b>건</span>
        <span className="text-yellow-600">임시저장 <b>{started}</b></span>
        <span className="text-green-600">제출완료 <b>{submitted}</b></span>
        <span className="text-gray-400">미시작 <b>{total - started - submitted}</b></span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b text-xs text-gray-500">
            <tr>
              <th className="text-left px-4 py-3">기관명</th>
              <th className="text-left px-4 py-3">진단지</th>
              <th className="text-left px-4 py-3">위원</th>
              <th className="text-left px-4 py-3">상태</th>
              <th className="text-right px-4 py-3">총점</th>
              <th className="text-right px-4 py-3">등급</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {subjectRows.map(s => {
              const assignments = s.assignments ?? []

              if (assignments.length === 0) {
                return (
                  <tr key={s.id} className="text-gray-400">
                    <td className="px-4 py-3 font-medium text-gray-700">{s.name}</td>
                    <td className="px-4 py-3">{INSTRUMENT_LABELS[s.instrument as InstrumentType]}</td>
                    <td className="px-4 py-3 italic">미배정</td>
                    <td colSpan={3} className="px-4 py-3"></td>
                  </tr>
                )
              }

              return assignments.map((a, idx) => {
                const ev = Array.isArray(a.evaluations) ? a.evaluations[0] : a.evaluations
                const statusKey = ev?.status ?? 'none'
                const badge = STATUS_BADGE[statusKey as keyof typeof STATUS_BADGE]
                return (
                  <tr key={a.id} className="hover:bg-gray-50">
                    {idx === 0 && (
                      <td className="px-4 py-3 font-medium text-gray-800" rowSpan={assignments.length}>
                        {s.name}
                      </td>
                    )}
                    {idx === 0 && (
                      <td className="px-4 py-3 text-gray-600" rowSpan={assignments.length}>
                        {INSTRUMENT_LABELS[s.instrument as InstrumentType]}
                        <span className="block text-xs text-gray-400">{s.stage ?? s.fiscal_year}</span>
                      </td>
                    )}
                    <td className="px-4 py-3 text-gray-800">{a.profiles?.name}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge.color}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-800 tabular-nums">
                      {ev?.total_score != null ? Number(ev.total_score).toFixed(1) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-blue-700">
                      {ev?.grade ?? '—'}
                    </td>
                  </tr>
                )
              })
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
