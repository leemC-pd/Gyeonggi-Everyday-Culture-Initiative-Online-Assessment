import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getConfig } from '@/lib/instruments'
import OperatorForm from './OperatorForm'

interface PageProps {
  params: Promise<{ token: string }>
}

export default async function OperatorSelfAssessmentPage({ params }: PageProps) {
  const { token } = await params
  const supabase = await createClient()

  const { data: tokenRow } = await supabase
    .from('operator_tokens')
    .select('id, space_name, subject_id, used_at, expires_at')
    .eq('token', token)
    .single()

  if (!tokenRow) notFound()

  const expired = tokenRow.expires_at && new Date(tokenRow.expires_at) < new Date()
  const submitted = !!tokenRow.used_at

  // 이미 제출한 경우 응답 조회
  let existingResponses: Record<string, string> = {}
  if (submitted) {
    const { data: existing } = await supabase
      .from('operator_self_assessments')
      .select('responses')
      .eq('token_id', tokenRow.id)
      .single()
    existingResponses = (existing?.responses as Record<string, string>) ?? {}
  }

  const config = getConfig()
  const form = config.selfAssessmentForms?.operator

  if (!form) return <p>설정 오류: 운영자 자가진단 폼을 찾을 수 없습니다.</p>

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-xl mx-auto px-4 py-10">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h1 className="text-lg font-bold text-gray-800 mb-1">공간 운영자 자가진단지</h1>
          <p className="text-sm text-gray-500 mb-1">2026 민간문화공간 활성화 평가</p>
          <p className="text-sm font-medium text-blue-700 mb-5">{tokenRow.space_name}</p>

          {expired ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
              이 링크는 만료되었습니다. 재단 담당자에게 문의해주세요.
            </div>
          ) : submitted ? (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
                자가진단이 이미 제출되었습니다. 감사합니다.
              </div>
              <div className="text-sm text-gray-600 space-y-2">
                {form.items.map((item) => (
                  <div key={item.q} className="border-b pb-2">
                    <p className="font-medium text-gray-700">Q{item.q}. {item.text}</p>
                    <p className="mt-1 text-gray-600">{existingResponses[`Q${item.q}`] ?? '—'}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <OperatorForm tokenId={tokenRow.id} subjectId={tokenRow.subject_id} items={form.items} />
          )}
        </div>
      </div>
    </main>
  )
}
