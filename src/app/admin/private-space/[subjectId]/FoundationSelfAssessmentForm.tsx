'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { SelfAssessmentItem } from '@/types'

interface Existing {
  id: string
  responses: Record<string, string>
  submitted_at: string
}

export default function FoundationSelfAssessmentForm({
  subjectId,
  items,
  existing,
}: {
  subjectId: string
  items: SelfAssessmentItem[]
  existing: Existing | null
}) {
  const router = useRouter()
  const [responses, setResponses] = useState<Record<string, string>>(existing?.responses ?? {})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  function set(key: string, value: string) {
    setResponses(prev => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  async function handleSave() {
    setLoading(true)
    setError('')
    const supabase = createClient()

    if (existing) {
      const { error } = await supabase
        .from('foundation_self_assessments')
        .update({ responses, submitted_at: new Date().toISOString() })
        .eq('id', existing.id)
      if (error) { setError(error.message); setLoading(false); return }
    } else {
      const { error } = await supabase
        .from('foundation_self_assessments')
        .insert({ subject_id: subjectId, responses })
      if (error) { setError(error.message); setLoading(false); return }
    }

    setSaved(true)
    router.refresh()
    setLoading(false)
  }

  return (
    <div className="space-y-5">
      {items.map(item => {
        const key = `Q${item.q}`
        return (
          <div key={item.q}>
            <p className="text-sm font-medium text-gray-800 mb-2">
              <span className="text-blue-600 mr-1">Q{item.q}.</span>
              {item.text}
            </p>

            {/* 구간 */}
            {item.type === '구간' && item.options && (
              <div className="flex gap-3 flex-wrap">
                {item.options.map(opt => (
                  <label key={opt} className="flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" name={key} value={opt}
                      checked={responses[key] === opt}
                      onChange={() => set(key, opt)}
                      className="accent-blue-600"
                    />
                    <span className="text-sm">{opt}</span>
                  </label>
                ))}
              </div>
            )}

            {/* 수치쌍 */}
            {item.type === '수치쌍' && (
              <div className="flex items-center gap-2">
                <input type="number" min={0}
                  value={responses[`${key}_n`] ?? ''}
                  onChange={e => set(`${key}_n`, e.target.value)}
                  className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="참여"
                />
                <span className="text-sm text-gray-500">/ 전체</span>
                <input type="number" min={0}
                  value={responses[`${key}_total`] ?? ''}
                  onChange={e => set(`${key}_total`, e.target.value)}
                  className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="전체"
                />
                <span className="text-sm text-gray-400">개소</span>
              </div>
            )}

            {/* 서술 */}
            {item.type === '서술' && (
              <textarea rows={3}
                value={responses[key] ?? ''}
                onChange={e => set(key, e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="자유롭게 작성해 주세요"
              />
            )}
          </div>
        )
      })}

      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && <p className="text-sm text-green-600">저장되었습니다.</p>}

      <button onClick={handleSave} disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
        {loading ? '저장 중...' : existing ? '수정 저장' : '저장'}
      </button>

      {existing && (
        <p className="text-xs text-gray-400">
          마지막 저장: {new Date(existing.submitted_at).toLocaleString('ko-KR')}
        </p>
      )}
    </div>
  )
}
