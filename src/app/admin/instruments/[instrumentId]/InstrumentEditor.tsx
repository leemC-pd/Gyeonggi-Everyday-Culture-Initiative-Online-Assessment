'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Item, InstrumentType } from '@/types'

interface Props {
  instrumentId: InstrumentType
  initialItems: Item[]
  areaCodes: readonly string[]
  areaNames: Record<string, string>
  readOnly?: boolean
}

export default function InstrumentEditor({ instrumentId, initialItems, areaCodes, areaNames, readOnly = false }: Props) {
  const router = useRouter()
  const [items, setItems] = useState<Item[]>(initialItems)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  function updateItem(index: number, field: keyof Item, value: string) {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item))
  }

  function deleteItem(index: number) {
    if (!confirm('이 문항을 삭제하시겠습니까?')) return
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  function addItem(areaCode: string) {
    const areaItems = items.filter(i => i.area === areaCode)
    const maxNo = areaItems.reduce((m, i) => Math.max(m, i.no), 0)
    const newItem: Item = {
      code: `${areaCode}${maxNo + 1}`,
      area: areaCode,
      no: maxNo + 1,
      type: 'likert7',
      appliesTo: 'all',
      text: '새 문항 텍스트를 입력하세요',
      anchor: null,
    }
    setItems(prev => [...prev, newItem])
  }

  async function handleSave() {
    setSaving(true)
    setMessage('')
    const res = await fetch('/api/admin/save-instrument', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instrumentId, items }),
    })
    const data = await res.json()
    if (data.ok) {
      setMessage('저장 완료')
      router.refresh()
    } else {
      setMessage(`오류: ${data.error}`)
    }
    setSaving(false)
  }

  function handleReset() {
    if (!confirm('원본 진단지로 초기화하시겠습니까? 모든 수정 내용이 삭제됩니다.')) return
    fetch('/api/admin/save-instrument', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instrumentId }),
    }).then(() => { setMessage('초기화 완료'); router.refresh() })
  }

  return (
    <div className="space-y-6">
      {readOnly && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">열람 전용 — 진단지 편집 권한이 없습니다.</p>
      )}
      {/* 저장 버튼 */}
      {!readOnly && (
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? '저장 중...' : '저장'}
        </button>
        <button
          onClick={handleReset}
          className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50"
        >
          원본으로 초기화
        </button>
        {message && <p className="text-sm text-gray-600">{message}</p>}
      </div>
      )}

      {/* 영역별 문항 */}
      {areaCodes.map(areaCode => {
        const areaItems = items.map((item, idx) => ({ item, idx })).filter(({ item }) => item.area === areaCode)

        return (
          <section key={areaCode} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 border-b px-5 py-3 flex items-center justify-between">
              <span className="font-semibold text-gray-700">{areaCode}. {areaNames[areaCode] ?? areaCode}</span>
              {!readOnly && (
                <button
                  onClick={() => addItem(areaCode)}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  + 문항 추가
                </button>
              )}
            </div>

            <div className="divide-y divide-gray-100">
              {areaItems.map(({ item, idx }) => (
                <div key={idx} className="px-5 py-4 space-y-2">
                  <div className="flex items-start gap-3">
                    <span className="text-xs font-mono text-gray-400 mt-2 w-10 shrink-0">{item.code}</span>
                    <textarea
                      rows={2}
                      value={item.text}
                      onChange={e => updateItem(idx, 'text', e.target.value)}
                      readOnly={readOnly}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                    <div className="flex flex-col gap-1 shrink-0">
                      <select
                        value={item.appliesTo}
                        onChange={e => updateItem(idx, 'appliesTo', e.target.value)}
                        disabled={readOnly}
                        className="border border-gray-300 rounded px-2 py-1 text-xs text-gray-700"
                      >
                        <option value="all">전체</option>
                        <option value="성장">성장</option>
                        <option value="진입">진입</option>
                      </select>
                      {!readOnly && (
                        <button
                          onClick={() => deleteItem(idx)}
                          className="text-xs text-red-400 hover:text-red-600 text-center"
                        >
                          삭제
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
