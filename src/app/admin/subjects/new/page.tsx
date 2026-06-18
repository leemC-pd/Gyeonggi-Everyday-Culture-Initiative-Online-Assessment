'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { InstrumentType, OperationStage, TargetModel, FiscalYearType } from '@/types'

const INSTRUMENTS: { value: InstrumentType; label: string }[] = [
  { value: 'platform_foundation', label: '플랫폼 — 기초재단' },
  { value: 'platform_org', label: '플랫폼 — 유관기관·단체' },
  { value: 'private_space_foundation', label: '민간공간 — 기초재단' },
]

export default function NewSubjectPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [instrument, setInstrument] = useState<InstrumentType>('platform_foundation')
  const [stage, setStage] = useState<OperationStage>('진입')
  const [fiscalYear, setFiscalYear] = useState<FiscalYearType>('신규')
  const [targetModel, setTargetModel] = useState<TargetModel>('개방-일반형')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isPrivate = instrument === 'private_space_foundation'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.from('subjects').insert({
      name,
      instrument,
      stage: isPrivate ? null : stage,
      fiscal_year: isPrivate ? fiscalYear : null,
      target_model: targetModel,
      notes: notes || null,
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/admin/subjects')
      router.refresh()
    }
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-bold text-gray-800 mb-6">평가 대상 등록</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">기관·단체·공간명 *</label>
          <input required value={name} onChange={e => setName(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="예: OO문화재단" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">진단지 종류 *</label>
          <select value={instrument} onChange={e => setInstrument(e.target.value as InstrumentType)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {INSTRUMENTS.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
          </select>
        </div>

        {isPrivate ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">사업 연차</label>
            <div className="flex gap-3">
              {(['신규', '연속'] as FiscalYearType[]).map(v => (
                <label key={v} className="flex items-center gap-1.5 cursor-pointer">
                  <input type="radio" name="fiscalYear" value={v} checked={fiscalYear === v}
                    onChange={() => setFiscalYear(v)} />
                  <span className="text-sm">{v}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1">채점에 미반영. [연속] 태그 문항 적용 여부만 결정됩니다.</p>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">성장단계 *</label>
            <div className="flex gap-3">
              {(['진입', '성장'] as OperationStage[]).map(v => (
                <label key={v} className="flex items-center gap-1.5 cursor-pointer">
                  <input type="radio" name="stage" value={v} checked={stage === v}
                    onChange={() => setStage(v)} />
                  <span className="text-sm">{v}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">대상모델</label>
          <select value={targetModel} onChange={e => setTargetModel(e.target.value as TargetModel)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {(['개방-일반형', '특정-공동체형', '혼합형'] as TargetModel[]).map(v => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
          <p className="text-xs text-gray-400 mt-1">특정-공동체형/혼합형은 다양성·개방성 영역에 위원 지침이 표시됩니다.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">비고</label>
          <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="선택 입력" />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3 justify-end pt-2">
          <button type="button" onClick={() => router.back()}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
            취소
          </button>
          <button type="submit" disabled={loading}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
            {loading ? '등록 중...' : '등록'}
          </button>
        </div>
      </form>
    </div>
  )
}
