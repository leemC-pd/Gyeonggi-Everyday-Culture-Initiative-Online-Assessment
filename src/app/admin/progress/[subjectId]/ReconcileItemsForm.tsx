'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { calculate } from '@/lib/scoring'
import type { Instrument, Item } from '@/types'

interface Props {
  subjectId: string
  instrument: Instrument
  stage: string | null
  items: Item[]              // 적용 문항만 (진입단계 성장문항 제외)
  areaNames: Record<string, string>
  initialScores: Record<string, number | null>  // 위원 평균 또는 이전 합의값
  existingReason: string | null
}

const LIKERT = ['①', '②', '③', '④', '⑤', '⑥', '⑦']

export default function ReconcileItemsForm({
  subjectId, instrument, stage, items, areaNames, initialScores, existingReason,
}: Props) {
  const router = useRouter()
  const [scores, setScores] = useState<Record<string, number | null>>(initialScores)
  const [reason, setReason] = useState(existingReason ?? '')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const result = useMemo(() => calculate(instrument, stage, scores), [instrument, stage, scores])

  // 영역별 그룹핑 (전달된 items 순서 유지)
  const byArea = useMemo(() => {
    const g: Record<string, Item[]> = {}
    for (const it of items) (g[it.area] ??= []).push(it)
    return g
  }, [items])
  const areaCodes = Object.keys(byArea)

  function setScore(code: string, v: string) {
    setScores(prev => ({ ...prev, [code]: v === '' ? null : Number(v) }))
  }

  async function handleSave() {
    setSaving(true)
    setMessage('')
    const res = await fetch('/api/admin/reconcile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subjectId, itemScores: scores, reason }),
    })
    const data = await res.json()
    setSaving(false)
    if (data.ok) {
      setMessage(`저장 완료 — 총점 ${Number(data.totalScore).toFixed(2)}점 / ${data.grade}등급`)
      router.refresh()
    } else {
      setMessage(`오류: ${data.error}`)
    }
  }

  return (
    <div className="space-y-5">
      <p className="text-xs text-gray-500">
        문항별 7점 점수를 조정하면 총점·등급이 자동 재계산됩니다. 초기값은 제출한 위원들의 평균입니다.
      </p>

      {areaCodes.map(area => (
        <div key={area} className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 border-b px-4 py-2 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">{area}. {areaNames[area] ?? area}</span>
            <span className="text-xs text-gray-500 tabular-nums">
              영역점수 {result.areaScores[area]?.toFixed(2) ?? '—'} / 배점 {(instrument.weights[
                instrument.stageWeighted && stage ? stage : Object.keys(instrument.weights)[0]
              ] as Record<string, number>)?.[area] ?? '—'}
            </span>
          </div>
          <div className="divide-y divide-gray-100">
            {byArea[area].map(item => {
              const val = scores[item.code]
              return (
                <div key={item.code} className="flex items-start gap-3 px-4 py-2.5">
                  <span className="text-xs font-mono text-gray-400 mt-1 w-8 shrink-0">{item.no}</span>
                  <span className="text-sm text-gray-800 flex-1">{item.text}</span>
                  <select
                    value={val ?? ''}
                    onChange={e => setScore(item.code, e.target.value)}
                    className="shrink-0 border border-gray-300 rounded px-2 py-1 text-sm text-gray-900"
                  >
                    <option value="">—</option>
                    {[7,6,5,4,3,2,1].map(v => (
                      <option key={v} value={v}>{LIKERT[v-1]} {v}</option>
                    ))}
                  </select>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {/* 결과 요약 */}
      <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
        <span className="text-sm text-gray-700">합의 총점</span>
        <span className="text-sm">
          <span className="font-bold text-gray-900 tabular-nums">{result.totalScore.toFixed(2)}</span>점
          <span className="ml-2 font-bold text-blue-700">{result.grade}</span>등급
        </span>
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

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? '저장 중...' : '합의점수 저장'}
        </button>
        {message && <span className="text-sm text-gray-600">{message}</span>}
      </div>
    </div>
  )
}
