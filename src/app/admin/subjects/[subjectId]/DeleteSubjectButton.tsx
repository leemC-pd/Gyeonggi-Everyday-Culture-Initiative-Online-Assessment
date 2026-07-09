'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DeleteSubjectButton({ subjectId, subjectName }: { subjectId: string; subjectName: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    if (!confirm(`'${subjectName}' 대상을 삭제할까요?\n배정·평가·응답·합의점수도 함께 삭제되며 되돌릴 수 없습니다.`)) return
    setLoading(true)
    const res = await fetch('/api/admin/delete-subject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subjectId }),
    })
    const data = await res.json()
    if (data.ok) {
      router.push('/admin/subjects')
      router.refresh()
    } else {
      alert(`삭제 실패: ${data.error}`)
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="text-xs text-red-500 hover:text-red-700 border border-red-200 rounded-lg px-3 py-1.5 disabled:opacity-50"
    >
      {loading ? '삭제 중...' : '대상 삭제'}
    </button>
  )
}
