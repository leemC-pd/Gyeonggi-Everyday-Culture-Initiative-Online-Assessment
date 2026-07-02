'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getAreaName } from '@/lib/instruments'

interface Props {
  subjectId: string
  areaCodes: string[]
  existingScores: Record<string, number> | null
  existingReason: string | null
}

export default function ReconcileForm({ subjectId, areaCodes, existingScores, existingReason }: Props) {
  const router = useRouter()
  const [scores, setScores] = useState<Record<string, string>>(
    Object.fromEntries(areaCodes.map(a => [a, existingScores?.[a]?.toFixed(2) ?? '']))
  )
  const [reason, setReason] = useState(existingReason ?? '')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const total = areaCodes.reduce((sum, a) => sum + (parseFloat(scores[a]) || 0), 0)
  const grade = total >= 85 ? 'A' : total >= 75 ? 'B' : 'C'

  async function handleSave() {
    setLoading(true)
    setMessage('')
    const areaScores: Record<string, number> = {}
    for (const a of areaCodes) {
      const v = parseFloat(scores[a])
      if (isNaN(v)) { setMessage(`${a}영역 점수가 유효하지 않습니다`); setLoading(false); return }
      areaScores[a] = v
    }
    const res = await fetch('/api/admin/reconcile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subjectId, areaScores, reason }),
    })
    const data = await res.json()
    if (data.ok) {
      setMessage(`저장 완료 — 총점 ${data.totalScore.toFixed(2)}점 / ${data.grade}등급`)
      router.refresh()
    } else {
      setMessage(`오류: ${data.error}`)
    }
    setLoading(false)
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-gray-500 border-b">
            <tr>
              {areaCodes.map(a => (
                <th key={a} className="text-center pb-2 px-2">{a}<br />{getAreaName(a)}</th>
              ))}
              <th className="text-right pb-2 px-2">합계</th>
              <th className="text-right pb-2">등급</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              {areaCodes.map(a => (
                <td key={a} className="px-2 py-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={scores[a]}
                    onChange={e => setScores(prev => ({ ...prev, [a]: e.target.value }))}
                    className="w-16 border border-gray-300 rounded px-2 py-1 text-right text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </td>
              ))}
              <td className="text-right px-2 font-semibold">{total.toFixed(2)}</td>
              <td className="text-right font-bold text-blue-700">{grade}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">수정 사유</label>
        <textarea
          rows={2}
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="위원 간 합의 내용 등"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? '저장 중...' : '합의점수 저장'}
        </button>
        {message && <p className="text-sm text-gray-600">{message}</p>}
      </div>
    </div>
  )
}
