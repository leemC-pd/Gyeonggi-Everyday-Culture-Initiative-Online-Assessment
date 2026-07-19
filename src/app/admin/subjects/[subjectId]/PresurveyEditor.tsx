'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function PresurveyEditor({
  subjectId,
  currentUrl,
}: {
  subjectId: string
  currentUrl: string | null
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [url, setUrl] = useState(currentUrl ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    setSaving(true)
    setError('')
    const res = await fetch('/api/admin/update-subject-presurvey', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subjectId, presurveyUrl: url }),
    })
    const data = await res.json()
    setSaving(false)
    if (data.ok) {
      setEditing(false)
      router.refresh()
    } else {
      setError(data.error || '저장 실패')
    }
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-3 text-sm">
        {currentUrl ? (
          <a href={currentUrl} target="_blank" rel="noopener noreferrer"
            className="text-blue-600 hover:underline break-all">📋 사전조사 응답 보기 ↗</a>
        ) : (
          <span className="text-gray-400">사전조사 링크 없음</span>
        )}
        <button onClick={() => setEditing(true)} className="text-xs text-gray-500 hover:text-gray-700 shrink-0">✎ 편집</button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <input
        value={url}
        onChange={e => setUrl(e.target.value)}
        placeholder="https://drive.google.com/... (구글폼 응답 PDF/시트 링크)"
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2">
        <button onClick={save} disabled={saving}
          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
          {saving ? '저장 중...' : '저장'}
        </button>
        <button onClick={() => { setEditing(false); setUrl(currentUrl ?? ''); setError('') }}
          className="px-3 py-1.5 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50">
          취소
        </button>
      </div>
    </div>
  )
}
