'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Assignment {
  id: string
  profiles: { id: string; name: string; email: string }
  evaluations: { status: string; total_score: number | null; grade: string | null } | null
}

interface Evaluator {
  id: string
  name: string
  email: string
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft:     { label: '임시저장', color: 'text-yellow-600' },
  submitted: { label: '제출완료', color: 'text-green-600' },
}

export default function AssignmentManager({
  subjectId,
  assignments,
  evaluators,
}: {
  subjectId: string
  assignments: Assignment[]
  evaluators: Evaluator[]
}) {
  const router = useRouter()
  const [selectedId, setSelectedId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleAssign() {
    if (!selectedId) return
    setLoading(true)
    setError('')
    const res = await fetch('/api/admin/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subjectId, evaluatorId: selectedId }),
    })
    const data = await res.json()
    if (data.ok) {
      setSelectedId('')
      router.refresh()
    } else {
      setError(data.error)
    }
    setLoading(false)
  }

  async function handleRemove(assignmentId: string, status: string | undefined) {
    if (status === 'submitted') {
      alert('이미 제출된 평가가 있어 배정을 취소할 수 없습니다.')
      return
    }
    if (!confirm('배정을 취소하시겠습니까?')) return
    await fetch('/api/admin/assign', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignmentId }),
    })
    router.refresh()
  }

  return (
    <div className="space-y-4">
      {/* 현재 배정 */}
      {assignments.length === 0 ? (
        <p className="text-sm text-gray-500">배정된 위원이 없습니다.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {assignments.map(a => {
            const ev = Array.isArray(a.evaluations) ? a.evaluations[0] : a.evaluations
            const badge = ev?.status ? STATUS_LABELS[ev.status] : null
            return (
              <li key={a.id} className="flex items-center justify-between py-2">
                <div>
                  <span className="text-sm font-medium text-gray-900">{a.profiles?.name}</span>
                  <span className="text-xs text-gray-600 ml-2">{a.profiles?.email}</span>
                  {badge && (
                    <span className={`ml-2 text-xs font-medium ${badge.color}`}>{badge.label}</span>
                  )}
                  {ev?.status === 'submitted' && ev.total_score != null && (
                    <span className="ml-2 text-xs text-gray-500">
                      {Number(ev.total_score).toFixed(1)}점 · {ev.grade}등급
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleRemove(a.id, ev?.status)}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  배정 취소
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {/* 위원 추가 */}
      {evaluators.length > 0 && (
        <div className="flex gap-2 pt-2">
          <select
            value={selectedId}
            onChange={e => setSelectedId(e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">위원 선택...</option>
            {evaluators.map(e => (
              <option key={e.id} value={e.id}>{e.name} ({e.email})</option>
            ))}
          </select>
          <button
            onClick={handleAssign}
            disabled={!selectedId || loading}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            배정
          </button>
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
