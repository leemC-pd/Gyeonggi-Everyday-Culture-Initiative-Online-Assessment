import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { InstrumentType, EvaluationStatus } from '@/types'

const INSTRUMENT_LABELS: Record<InstrumentType, string> = {
  platform_foundation: '플랫폼 — 기초재단',
  platform_org: '플랫폼 — 유관기관·단체',
  private_space_foundation: '민간공간 — 기초재단',
}

const STATUS_BADGE: Record<EvaluationStatus | 'none', { label: string; color: string }> = {
  none:      { label: '미시작',   color: 'bg-gray-100 text-gray-600' },
  draft:     { label: '임시저장', color: 'bg-yellow-100 text-yellow-700' },
  submitted: { label: '제출완료', color: 'bg-green-100 text-green-700' },
}

interface AssignmentRow {
  id: string
  subjects: {
    name: string
    instrument: InstrumentType
    stage: string | null
    fiscal_year: string | null
  }
  evaluations: {
    status: EvaluationStatus
    total_score: number | null
    grade: string | null
  } | null
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: assignments } = await supabase
    .from('assignments')
    .select(`id, subjects(name, instrument, stage, fiscal_year), evaluations(status, total_score, grade)`)
    .eq('evaluator_id', user.id)
    .order('created_at')

  const rows = (assignments ?? []) as unknown as AssignmentRow[]

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-gray-800">2026 생활문화 평가시스템</h1>
          <p className="text-xs text-gray-500 mt-0.5">{user.email}</p>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-700">배정된 평가 대상</h2>
          <div className="flex gap-2 text-xs">
            <Link href="/preview/platform_foundation" className="text-blue-600 hover:underline">진단지 미리보기 (재단)</Link>
            <span className="text-gray-300">|</span>
            <Link href="/preview/platform_org" className="text-blue-600 hover:underline">진단지 미리보기 (단체)</Link>
            <span className="text-gray-300">|</span>
            <Link href="/preview/private_space_foundation" className="text-blue-600 hover:underline">진단지 미리보기 (민간공간)</Link>
          </div>
        </div>

        {rows.length === 0 ? (
          <p className="text-sm text-gray-500">배정된 평가 대상이 없습니다.</p>
        ) : (
          <ul className="space-y-3">
            {rows.map(row => {
              const ev = Array.isArray(row.evaluations) ? row.evaluations[0] : row.evaluations
              const statusKey: EvaluationStatus | 'none' = ev?.status ?? 'none'
              const badge = STATUS_BADGE[statusKey]
              const stageLabel = row.subjects.stage ?? row.subjects.fiscal_year ?? ''

              return (
                <li key={row.id}>
                  <Link
                    href={`/evaluate/${row.id}`}
                    className="block bg-white rounded-xl border border-gray-200 hover:border-blue-400 hover:shadow-sm transition p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-gray-800">{row.subjects.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {INSTRUMENT_LABELS[row.subjects.instrument]}
                          {stageLabel && <span className="ml-2 text-gray-400">· {stageLabel}</span>}
                        </p>
                      </div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${badge.color}`}>
                        {badge.label}
                      </span>
                    </div>
                    {ev?.status === 'submitted' && ev.total_score !== null && (
                      <p className="text-sm text-gray-600 mt-2">
                        총점 <span className="font-semibold">{Number(ev.total_score).toFixed(1)}</span>점
                        <span className="ml-2 font-bold text-blue-700">등급 {ev.grade}</span>
                      </p>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </main>
  )
}
