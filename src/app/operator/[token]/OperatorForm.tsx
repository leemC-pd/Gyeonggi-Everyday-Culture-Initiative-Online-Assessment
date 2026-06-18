'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface FormItem {
  q: number
  text: string
  type: string
  options?: string[]
}

export default function OperatorForm({
  tokenId,
  subjectId,
  items,
}: {
  tokenId: string
  subjectId: string
  items: FormItem[]
}) {
  const [responses, setResponses] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  function set(key: string, value: string) {
    setResponses(prev => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    // 필수 응답 체크
    const missing = items.filter(item => {
      const key = `Q${item.q}`
      return item.type !== '서술' && item.type !== '유무서술' && !responses[key]
    })
    if (missing.length > 0) {
      setError(`미응답 항목이 있습니다: ${missing.map(i => `Q${i.q}`).join(', ')}`)
      return
    }

    setSubmitting(true)
    setError('')
    const supabase = createClient()

    const { error: insertError } = await supabase
      .from('operator_self_assessments')
      .insert({ token_id: tokenId, subject_id: subjectId, responses })

    if (insertError) {
      setError(insertError.message)
      setSubmitting(false)
      return
    }

    // 토큰 사용 처리
    await supabase
      .from('operator_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('id', tokenId)

    setDone(true)
    setSubmitting(false)
  }

  if (done) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
        <p className="font-semibold">제출이 완료되었습니다. 감사합니다.</p>
        <p className="mt-1 text-green-600">응답이 평가에 반영됩니다.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {items.map(item => {
        const key = `Q${item.q}`
        return (
          <div key={item.q}>
            <p className="text-sm font-medium text-gray-800 mb-2">
              <span className="text-blue-600 mr-1">Q{item.q}.</span>
              {item.text}
            </p>

            {/* 4점 척도 */}
            {item.type === '4점' && item.options && (
              <div className="flex gap-2 flex-wrap">
                {item.options.map(opt => (
                  <label key={opt} className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name={key}
                      value={opt}
                      checked={responses[key] === opt}
                      onChange={() => set(key, opt)}
                      className="accent-blue-600"
                    />
                    <span className="text-sm">{opt}</span>
                  </label>
                ))}
              </div>
            )}

            {/* 유무서술 */}
            {item.type === '유무서술' && (
              <div className="space-y-2">
                <div className="flex gap-3">
                  {['있음', '없음'].map(opt => (
                    <label key={opt} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name={`${key}_yn`}
                        value={opt}
                        checked={(responses[key] ?? '').startsWith(opt)}
                        onChange={() => set(key, opt)}
                        className="accent-blue-600"
                      />
                      <span className="text-sm">{opt}</span>
                    </label>
                  ))}
                </div>
                <textarea
                  rows={3}
                  value={responses[key]?.replace(/^있음|^없음/, '') ?? ''}
                  onChange={e => {
                    const yn = (responses[key] ?? '').match(/^있음|^없음/)?.[0] ?? ''
                    set(key, yn + e.target.value)
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="자세히 적어주세요 (선택)"
                />
              </div>
            )}

            {/* 서술 */}
            {item.type === '서술' && (
              <textarea
                rows={4}
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

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
      >
        {submitting ? '제출 중...' : '자가진단 제출'}
      </button>

      <p className="text-xs text-gray-400 text-center">
        한 번 제출하면 수정할 수 없습니다. 내용을 확인 후 제출해주세요.
      </p>
    </form>
  )
}
