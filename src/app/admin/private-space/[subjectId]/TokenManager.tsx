'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { SelfAssessmentItem } from '@/types'

interface TokenRow {
  id: string
  token: string
  space_name: string
  expires_at: string | null
  used_at: string | null
}

export default function TokenManager({
  subjectId,
  tokens,
  operatorMap,
  operatorItems,
}: {
  subjectId: string
  tokens: TokenRow[]
  operatorMap: Record<string, Record<string, string>>
  operatorItems: SelfAssessmentItem[]
}) {
  const router = useRouter()
  const [spaceName, setSpaceName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  async function handleCreate() {
    if (!spaceName.trim()) return
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase
      .from('operator_tokens')
      .insert({ subject_id: subjectId, space_name: spaceName.trim() })
    if (error) setError(error.message)
    else { setSpaceName(''); router.refresh() }
    setLoading(false)
  }

  function getLink(token: string) {
    return `${location.origin}/operator/${token}`
  }

  async function copyLink(token: string, id: string) {
    await navigator.clipboard.writeText(getLink(token))
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="space-y-4">
      {/* 발급된 토큰 목록 */}
      {tokens.length > 0 && (
        <div className="divide-y divide-gray-100">
          {tokens.map(t => {
            const responses = operatorMap[t.id]
            return (
              <div key={t.id} className="py-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{t.space_name}</p>
                    <p className="text-xs text-gray-400 mt-0.5 font-mono truncate max-w-xs">
                      {getLink(t.token)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {t.used_at ? (
                      <span className="text-xs text-green-600 font-medium">제출완료</span>
                    ) : (
                      <span className="text-xs text-yellow-600">미제출</span>
                    )}
                    <button
                      onClick={() => copyLink(t.token, t.id)}
                      className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50"
                    >
                      {copiedId === t.id ? '복사됨!' : '링크 복사'}
                    </button>
                  </div>
                </div>

                {/* 제출된 응답 미리보기 */}
                {responses && (
                  <details className="mt-2">
                    <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">응답 보기</summary>
                    <div className="mt-2 pl-3 space-y-1 text-xs text-gray-600">
                      {operatorItems.map(item => (
                        <div key={item.q}>
                          <span className="text-gray-400">Q{item.q}.</span>{' '}
                          <span>{responses[`Q${item.q}`] ?? '—'}</span>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* 새 토큰 발급 */}
      <div className="flex gap-2 pt-2">
        <input
          value={spaceName}
          onChange={e => setSpaceName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="공간명 입력 후 발급"
        />
        <button
          onClick={handleCreate}
          disabled={!spaceName.trim() || loading}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          토큰 발급
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
