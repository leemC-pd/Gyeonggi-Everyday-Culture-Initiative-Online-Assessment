import Link from 'next/link'
import { createServiceClient as createClient } from '@/lib/supabase/service'
import { getCurrentRole } from '@/lib/auth'
import type { InstrumentType } from '@/types'
import UploadButton from './UploadButton'

const INSTRUMENT_LABELS: Record<InstrumentType, string> = {
  platform_foundation: '플랫폼 — 재단',
  platform_org: '플랫폼 — 단체',
  private_space_foundation: '공간활성화 — 재단',
}

export default async function SubjectsPage() {
  const supabase = createClient()
  const canEdit = (await getCurrentRole()) === 'admin'

  const { data: subjects } = await supabase
    .from('subjects')
    .select('id, name, title, instrument, stage, fiscal_year')
    .order('instrument')
    .order('name')

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800">평가 대상</h1>
        {canEdit && (
          <div className="flex gap-2">
            <UploadButton />
            <Link href="/admin/subjects/new"
              className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700">
              + 대상 등록
            </Link>
          </div>
        )}
      </div>

      {!subjects?.length ? (
        <p className="text-sm text-gray-500">등록된 평가 대상이 없습니다.</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b text-xs text-gray-500">
              <tr>
                <th className="text-left px-4 py-3">기관명</th>
                <th className="text-left px-4 py-3">사업명</th>
                <th className="text-left px-4 py-3">진단지</th>
                <th className="text-left px-4 py-3">단계</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {subjects.map(s => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{s.name}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{(s as { title?: string }).title ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{INSTRUMENT_LABELS[s.instrument as InstrumentType]}</td>
                  <td className="px-4 py-3 text-gray-500">{s.stage ?? s.fiscal_year ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/subjects/${s.id}`}
                      className="text-blue-600 hover:underline text-xs">
                      배정·상세
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
