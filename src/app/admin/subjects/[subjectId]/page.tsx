import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServiceClient as createClient } from '@/lib/supabase/service'
import AssignmentManager from './AssignmentManager'
import SubjectStageEditor from './SubjectStageEditor'
import SubjectActivityEditor from './SubjectActivityEditor'
import DeleteSubjectButton from './DeleteSubjectButton'
import PresurveyEditor from './PresurveyEditor'
import { getCurrentRole } from '@/lib/auth'
import type { InstrumentType } from '@/types'

const INSTRUMENT_LABELS: Record<InstrumentType, string> = {
  platform_foundation: '플랫폼 — 재단',
  platform_org: '플랫폼 — 단체',
  private_space_foundation: '공간활성화 — 재단',
}

interface PageProps {
  params: Promise<{ subjectId: string }>
}

export default async function SubjectDetailPage({ params }: PageProps) {
  const { subjectId } = await params
  const supabase = createClient()
  const canEdit = (await getCurrentRole()) === 'admin'

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

  type AssignmentRow = {
    id: string
    profiles: { id: string; name: string; email: string }
    evaluations: { id: string; status: string; total_score: number | null; grade: string | null; area_scores: Record<string, number> | null } | null
  }
  const rows = (assignments ?? []) as unknown as AssignmentRow[]
  const assignedIds = rows.map(a => a.profiles?.id)

  return (
    <div className="max-w-3xl">
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/subjects" className="text-gray-400 hover:text-gray-600 text-sm">← 목록</Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-800">{subject.name}</h1>
          <p className="text-sm text-gray-500 flex items-center flex-wrap gap-1">
            {INSTRUMENT_LABELS[subject.instrument as InstrumentType]}
            {subject.instrument !== 'private_space_foundation' && (
              <span className="ml-1">· {canEdit ? (
                <SubjectStageEditor
                  subjectId={subjectId}
                  currentStage={subject.stage ?? null}
                  instrument={subject.instrument}
                />
              ) : (subject.stage ?? '단계미설정')}</span>
            )}
            {subject.target_model && <span className="ml-2">· {subject.target_model}</span>}
            <span className="ml-1">· {canEdit ? (
              <SubjectActivityEditor
                subjectId={subjectId}
                currentActivity={subject.activity_type ?? null}
                instrument={subject.instrument}
              />
            ) : (subject.activity_type ?? '활동유형미설정')}</span>
            {subject.history && <span className="ml-2">· {subject.history}</span>}
          </p>
        </div>
        {canEdit && <DeleteSubjectButton subjectId={subjectId} subjectName={subject.name} />}
      </div>

      {/* 사전조사 링크 */}
      <section className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h2 className="font-semibold text-gray-700 mb-3">사전조사 링크</h2>
        {canEdit ? (
          <PresurveyEditor subjectId={subjectId} currentUrl={subject.presurvey_url ?? null} />
        ) : subject.presurvey_url ? (
          <a href={subject.presurvey_url} target="_blank" rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline break-all">📋 사전조사 응답 보기 ↗</a>
        ) : (
          <span className="text-sm text-gray-400">사전조사 링크 없음</span>
        )}
      </section>

      {/* 위원 배정 */}
      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-700 mb-4">위원 배정</h2>
        <AssignmentManager
          subjectId={subjectId}
          assignments={rows}
          evaluators={(evaluators ?? []).filter(e => !assignedIds.includes(e.id))}
          readOnly={!canEdit}
        />
      </section>

      <p className="text-xs text-gray-400 mt-4">
        점수 비교·편차·합의점수는 <Link href={`/admin/progress/${subjectId}`} className="text-blue-600 hover:underline">진행상황</Link>에서 확인합니다.
      </p>
    </div>
  )
}
