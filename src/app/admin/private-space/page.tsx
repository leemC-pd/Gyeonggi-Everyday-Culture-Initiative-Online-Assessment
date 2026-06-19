import Link from 'next/link'
import { createServiceClient as createClient } from '@/lib/supabase/service'

export default async function PrivateSpaceListPage() {
  const supabase = createClient()

  const { data: subjects } = await supabase
    .from('subjects')
    .select(`
      id, name, stage, fiscal_year,
      operator_tokens ( id, space_name, used_at ),
      foundation_self_assessments ( id )
    `)
    .eq('instrument', 'private_space_foundation')
    .order('name')

  type Row = {
    id: string
    name: string
    fiscal_year: string | null
    operator_tokens: { id: string; space_name: string; used_at: string | null }[]
    foundation_self_assessments: { id: string }[]
  }
  const rows = (subjects ?? []) as unknown as Row[]

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-800 mb-6">민간공간 관리</h1>

      {rows.length === 0 ? (
        <p className="text-sm text-gray-500">등록된 민간공간 대상이 없습니다.</p>
      ) : (
        <div className="space-y-3">
          {rows.map(s => {
            const totalTokens = s.operator_tokens.length
            const submittedTokens = s.operator_tokens.filter(t => t.used_at).length
            const foundationDone = s.foundation_self_assessments.length > 0

            return (
              <Link key={s.id} href={`/admin/private-space/${s.id}`}
                className="block bg-white rounded-xl border border-gray-200 hover:border-blue-400 hover:shadow-sm transition p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-800">{s.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{s.fiscal_year ?? '—'}</p>
                  </div>
                  <div className="flex gap-3 text-xs text-right">
                    <div>
                      <p className="text-gray-400">운영자 자가진단</p>
                      <p className={`font-semibold ${submittedTokens === totalTokens && totalTokens > 0 ? 'text-green-600' : 'text-yellow-600'}`}>
                        {submittedTokens}/{totalTokens}건
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400">재단 자가진단</p>
                      <p className={`font-semibold ${foundationDone ? 'text-green-600' : 'text-gray-400'}`}>
                        {foundationDone ? '완료' : '미제출'}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
