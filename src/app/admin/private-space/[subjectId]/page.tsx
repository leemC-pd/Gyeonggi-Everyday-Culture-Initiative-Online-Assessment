import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServiceClient as createClient } from '@/lib/supabase/service'
import { getConfig } from '@/lib/instruments'
import TokenManager from './TokenManager'
import FoundationSelfAssessmentForm from './FoundationSelfAssessmentForm'
import CrossCheckTable from './CrossCheckTable'

interface PageProps {
  params: Promise<{ subjectId: string }>
}

export default async function PrivateSpaceDetailPage({ params }: PageProps) {
  const { subjectId } = await params
  const supabase = createClient()

  const { data: subject } = await supabase
    .from('subjects')
    .select('id, name, fiscal_year')
    .eq('id', subjectId)
    .eq('instrument', 'private_space_foundation')
    .single()

  if (!subject) notFound()

  // 운영자 토큰 목록
  const { data: tokens } = await supabase
    .from('operator_tokens')
    .select('id, token, space_name, expires_at, used_at, created_at')
    .eq('subject_id', subjectId)
    .order('created_at')

  // 운영자 자가진단 응답
  const { data: operatorAssessments } = await supabase
    .from('operator_self_assessments')
    .select('token_id, responses, submitted_at')
    .eq('subject_id', subjectId)

  // 재단 자가진단
  const { data: foundationAssessment } = await supabase
    .from('foundation_self_assessments')
    .select('id, responses, submitted_at')
    .eq('subject_id', subjectId)
    .single()

  const config = getConfig()
  const forms = config.selfAssessmentForms

  if (!forms) return <p>설정 오류</p>

  const operatorMap: Record<string, Record<string, string>> = {}
  for (const oa of operatorAssessments ?? []) {
    operatorMap[oa.token_id] = oa.responses as Record<string, string>
  }

  const tokenRows = (tokens ?? []) as {
    id: string; token: string; space_name: string
    expires_at: string | null; used_at: string | null; created_at: string
  }[]

  return (
    <div className="max-w-3xl space-y-8">
      <div className="flex items-center gap-3">
        <Link href="/admin/private-space" className="text-gray-400 hover:text-gray-600 text-sm">← 목록</Link>
        <div>
          <h1 className="text-xl font-bold text-gray-800">{subject.name}</h1>
          <p className="text-xs text-gray-500">{subject.fiscal_year ?? '—'}</p>
        </div>
      </div>

      {/* 운영자 토큰 관리 */}
      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-700 mb-1">운영자 자가진단 토큰</h2>
        <p className="text-xs text-gray-400 mb-4">공간별로 토큰 링크를 발급해 운영자에게 전달합니다. 계정 없이 접근 가능.</p>
        <TokenManager
          subjectId={subjectId}
          tokens={tokenRows}
          operatorMap={operatorMap}
          operatorItems={forms.operator.items}
        />
      </section>

      {/* 재단 자가진단 */}
      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-700 mb-1">재단 담당자 자가진단</h2>
        <p className="text-xs text-gray-400 mb-4">재단 담당자가 직접 입력합니다.</p>
        <FoundationSelfAssessmentForm
          subjectId={subjectId}
          items={forms.foundation.items}
          existing={foundationAssessment ? {
            id: foundationAssessment.id,
            responses: foundationAssessment.responses as Record<string, string>,
            submitted_at: foundationAssessment.submitted_at,
          } : null}
        />
      </section>

      {/* 교차표 */}
      {foundationAssessment && operatorAssessments && operatorAssessments.length > 0 && (
        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-700 mb-1">교차 검증표</h2>
          <p className="text-xs text-gray-400 mb-4">재단·운영자 응답 비교. 불일치 시 낮은 쪽을 가중합니다.</p>
          <CrossCheckTable
            crossCheckMap={forms.crossCheckMap}
            foundationResponses={foundationAssessment.responses as Record<string, string>}
            operatorAssessments={tokenRows.map(t => ({
              spaceName: t.space_name,
              responses: operatorMap[t.id] ?? null,
            }))}
          />
        </section>
      )}
    </div>
  )
}
