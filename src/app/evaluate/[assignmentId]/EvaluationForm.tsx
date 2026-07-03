'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ensureEvaluation, saveResponse, saveQualitative, saveInterview, submitEvaluation } from './actions'
import { calculate, itemApplies } from '@/lib/scoring'
import { getAreaName, getConfig, AREA_CODES } from '@/lib/instruments'
import type { Instrument, Item, TargetModel, ScoringResult } from '@/types'

const LIKERT_LABELS: Record<number, string> = {
  7: '매우 우수', 6: '우수', 5: '다소 우수', 4: '보통',
  3: '다소 미흡', 2: '미흡', 1: '매우 미흡'
}

const GUIDANCE_MODELS: TargetModel[] = ['특정-공동체형', '혼합형']

interface Props {
  assignmentId: string
  instrument: Instrument
  stage: string | null
  targetModel: TargetModel | null
  initialEvaluationId: string | null
  initialResponses: Record<string, number | null>
  initialQualitative: Record<string, string>
  initialNa: string[]
  initialInterview: { interview_target: string; interview_datetime: string; interview_place: string }
  isSubmitted: boolean
  submittedResult: ScoringResult | null
  submittedAreaScores: Record<string, number> | null
}

export default function EvaluationForm({
  assignmentId,
  instrument,
  stage,
  targetModel,
  initialEvaluationId,
  initialResponses,
  initialQualitative,
  initialNa,
  initialInterview,
  isSubmitted,
  submittedResult,
  submittedAreaScores,
}: Props) {
  const router = useRouter()
  const [evaluationId, setEvaluationId] = useState<string | null>(initialEvaluationId)
  const [scores, setScores] = useState<Record<string, number | null>>(initialResponses)
  const [naItems, setNaItems] = useState<Set<string>>(new Set(initialNa))
  const [qualitative, setQualitative] = useState<Record<string, string>>(initialQualitative)
  const [interview, setInterview] = useState(initialInterview)
  const [saving, setSaving] = useState(false)
  const [submitDone, setSubmitDone] = useState(isSubmitted)
  const [result, setResult] = useState<ScoringResult | null>(submittedResult)
  const [error, setError] = useState('')
  const debounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const config = getConfig()
  const weightKey = instrument.stageWeighted && stage ? stage : 'all'
  const weights = (instrument.weights[weightKey] ?? instrument.weights[Object.keys(instrument.weights)[0]] ?? {}) as Record<string, number>

  // 영역별로 문항 그룹핑
  const areaItems: Record<string, Item[]> = {}
  for (const item of instrument.items) {
    if (!areaItems[item.area]) areaItems[item.area] = []
    areaItems[item.area].push(item)
  }
  const activeAreas = AREA_CODES.filter(a => areaItems[a]?.length)

  async function getOrCreateEvalId(): Promise<string> {
    if (evaluationId) return evaluationId
    const id = await ensureEvaluation(assignmentId)
    setEvaluationId(id)
    return id
  }

  const handleScoreChange = useCallback((itemCode: string, value: number) => {
    setScores(prev => ({ ...prev, [itemCode]: value }))
    setNaItems(prev => {
      if (!prev.has(itemCode)) return prev
      const next = new Set(prev); next.delete(itemCode); return next
    })
    // debounced auto-save
    clearTimeout(debounceRef.current[itemCode])
    debounceRef.current[itemCode] = setTimeout(async () => {
      try {
        const id = await getOrCreateEvalId()
        await saveResponse(id, itemCode, value, null, false)
      } catch (e) {
        console.error(e)
      }
    }, 1000)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evaluationId, assignmentId])

  const handleNaToggle = useCallback(async (itemCode: string, checked: boolean) => {
    setNaItems(prev => {
      const next = new Set(prev)
      if (checked) next.add(itemCode); else next.delete(itemCode)
      return next
    })
    if (checked) setScores(prev => ({ ...prev, [itemCode]: null }))
    try {
      const id = await getOrCreateEvalId()
      await saveResponse(id, itemCode, null, null, checked)
    } catch (e) {
      console.error(e)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evaluationId, assignmentId])

  const handleQualChange = useCallback((areaCode: string, text: string) => {
    setQualitative(prev => ({ ...prev, [areaCode]: text }))
    clearTimeout(debounceRef.current[`qual_${areaCode}`])
    debounceRef.current[`qual_${areaCode}`] = setTimeout(async () => {
      try {
        const id = await getOrCreateEvalId()
        await saveQualitative(id, areaCode, text)
      } catch (e) {
        console.error(e)
      }
    }, 1000)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evaluationId, assignmentId])

  const handleInterviewChange = useCallback((field: keyof typeof interview, value: string) => {
    setInterview(prev => ({ ...prev, [field]: value }))
    clearTimeout(debounceRef.current[`iv_${field}`])
    debounceRef.current[`iv_${field}`] = setTimeout(async () => {
      try {
        const id = await getOrCreateEvalId()
        await saveInterview(id, { ...interview, [field]: value })
      } catch (e) {
        console.error(e)
      }
    }, 1000)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evaluationId, assignmentId, interview])

  async function handleManualSave() {
    setSaving(true)
    setError('')
    try {
      const id = await getOrCreateEvalId()
      await Promise.all([
        saveInterview(id, interview),
        ...Object.entries(scores).map(([code, val]) => saveResponse(id, code, val, null, naItems.has(code))),
        ...Object.entries(qualitative).map(([area, text]) => saveQualitative(id, area, text)),
      ])
    } catch (e) {
      setError(String(e))
    }
    setSaving(false)
  }

  function findMissing(): string[] {
    const missing: string[] = []
    // 인터뷰 정보
    if (!interview.interview_target?.trim()) missing.push('인터뷰 대상')
    if (!interview.interview_datetime?.trim()) missing.push('인터뷰 일시')
    if (!interview.interview_place?.trim()) missing.push('인터뷰 장소')
    // 문항 응답 (적용 문항 중 N/A 아닌데 점수 없는 것)
    for (const item of instrument.items) {
      if (!itemApplies(item, stage)) continue
      if (naItems.has(item.code)) continue
      const v = scores[item.code]
      if (v === null || v === undefined) missing.push(`${item.no}번 문항`)
    }
    // 영역별 정성 평가
    for (const areaCode of activeAreas) {
      if (!qualitative[areaCode]?.trim()) missing.push(`${areaCode}영역 정성 평가`)
    }
    return missing
  }

  async function handleSubmit() {
    const missing = findMissing()
    if (missing.length > 0) {
      setError(`미입력 항목이 있어 제출할 수 없습니다 (${missing.length}건).`)
      return
    }
    if (!confirm('최종 제출하면 수정할 수 없습니다. 제출하시겠습니까?')) return
    setSaving(true)
    setError('')
    try {
      const id = await getOrCreateEvalId()
      // 저장 먼저
      await Promise.all([
        saveInterview(id, interview),
        ...Object.entries(scores).map(([code, val]) => saveResponse(id, code, val, null, naItems.has(code))),
        ...Object.entries(qualitative).map(([area, text]) => saveQualitative(id, area, text)),
      ])
      const res = await submitEvaluation(assignmentId, id)
      setResult(res)
      setSubmitDone(true)
      router.refresh()
    } catch (e) {
      setError(String(e))
    }
    setSaving(false)
  }

  // 실시간 점수 미리보기 (제출 전)
  const preview = !submitDone ? calculate(instrument, stage, scores) : null

  const showGuidance = targetModel && GUIDANCE_MODELS.includes(targetModel)
  const guidanceItems = config.targetModel.guidanceItems

  return (
    <div className="space-y-8">
      {/* 인터뷰 정보 */}
      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-700 mb-3">인터뷰 정보</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">인터뷰 대상 (소속/직위/이름)</label>
            {submitDone ? (
              <p className="text-sm text-gray-800">{interview.interview_target || '—'}</p>
            ) : (
              <input
                value={interview.interview_target}
                onChange={e => handleInterviewChange('interview_target', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">인터뷰 일시</label>
            {submitDone ? (
              <p className="text-sm text-gray-800">{interview.interview_datetime || '—'}</p>
            ) : (
              <input
                value={interview.interview_datetime}
                onChange={e => handleInterviewChange('interview_datetime', e.target.value)}
                placeholder="예: 2026.09.12.(토) 14:00"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">인터뷰 장소</label>
            {submitDone ? (
              <p className="text-sm text-gray-800">{interview.interview_place || '—'}</p>
            ) : (
              <input
                value={interview.interview_place}
                onChange={e => handleInterviewChange('interview_place', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
          </div>
        </div>
      </section>

      {/* 대상모델 지침 배너 */}
      {showGuidance && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
          <p className="font-semibold mb-1">위원 지침 — {targetModel}</p>
          <p>{config.targetModel.guidanceText}</p>
        </div>
      )}

      {/* 영역별 문항 */}
      {activeAreas.map(areaCode => {
        const items = areaItems[areaCode] ?? []
        const weight = weights[areaCode] ?? 0
        const isGuidanceArea = showGuidance && items.some(i => guidanceItems.includes(i.code))

        return (
          <section key={areaCode} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 border-b px-5 py-3 flex items-center justify-between">
              <div>
                <span className="font-semibold text-gray-700">{areaCode}. {getAreaName(areaCode)}</span>
                <span className="ml-2 text-xs text-gray-500">배점 {weight}점</span>
              </div>
              {!submitDone && preview && (
                <span className="text-xs text-gray-500">
                  영역점수 {preview.areaScores[areaCode]?.toFixed(1) ?? '—'}점
                </span>
              )}
            </div>

            {config.areas[areaCode]?.note
              && !(instrument.id === 'private_space_foundation' && areaCode === 'C') && (
              <div className="bg-amber-50 border-b border-amber-100 px-5 py-2 text-xs text-amber-700">
                {config.areas[areaCode].note}
              </div>
            )}

            {isGuidanceArea && (
              <div className="bg-blue-50 border-b border-blue-100 px-5 py-2 text-xs text-blue-700">
                이 영역은 대상모델({targetModel}) 기준으로 해석합니다.
              </div>
            )}

            <div className="divide-y divide-gray-100">
              {items.map(item => {
                const applies = itemApplies(item, stage)
                const isNa = naItems.has(item.code)
                const currentScore = scores[item.code]

                return (
                  <div key={item.code} className={`px-5 py-4 ${(!applies || isNa) ? 'opacity-50' : ''}`}>
                    <p className="text-sm text-gray-800 mb-3">
                      <span className="text-xs font-mono text-gray-400 mr-2">{item.code}</span>
                      {item.text}
                      {!applies && <span className="ml-2 text-xs text-gray-400">[해당없음 — 자동 제외]</span>}
                    </p>

                    {applies && item.naAllowed && !submitDone && (
                      <label className="flex items-center gap-1.5 mb-2 cursor-pointer w-fit">
                        <input
                          type="checkbox"
                          checked={isNa}
                          onChange={e => handleNaToggle(item.code, e.target.checked)}
                        />
                        <span className="text-xs text-gray-600">해당없음 (신규 공간만 지원한 경우 — 채점 제외)</span>
                      </label>
                    )}

                    {applies && !isNa && !submitDone && (
                      <div className="flex gap-1 flex-wrap">
                        {[7,6,5,4,3,2,1].map(v => (
                          <label key={v} className="flex flex-col items-center cursor-pointer group">
                            <input
                              type="radio"
                              name={`item_${item.code}`}
                              value={v}
                              checked={currentScore === v}
                              onChange={() => handleScoreChange(item.code, v)}
                              className="sr-only"
                            />
                            <span className={`w-9 h-9 flex items-center justify-center rounded-full text-sm font-medium border transition
                              ${currentScore === v
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white text-gray-600 border-gray-300 group-hover:border-blue-400'}`}>
                              {['①','②','③','④','⑤','⑥','⑦'][v-1]}
                            </span>
                            <span className="text-[10px] text-gray-400 mt-0.5 w-12 text-center leading-tight">
                              {LIKERT_LABELS[v]}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}

                    {applies && submitDone && (
                      <p className="text-sm text-gray-600">
                        선택: <span className="font-medium">
                          {isNa
                            ? '해당없음 (채점 제외)'
                            : currentScore ? `${['①','②','③','④','⑤','⑥','⑦'][currentScore-1]} (${LIKERT_LABELS[currentScore]})` : '미입력'}
                        </span>
                      </p>
                    )}

                    {/* 앵커 힌트 */}
                    {item.anchor && applies && (
                      <details className="mt-2">
                        <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">채점 기준 보기</summary>
                        <ul className="mt-1 space-y-1 text-xs text-gray-600 pl-3">
                          {Object.entries(item.anchor).map(([k, v]) => (
                            <li key={k}><span className="font-medium">{['①','②','③','④','⑤','⑥','⑦'][Number(k)-1]}({k}점)</span> — {v}</li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                )
              })}
            </div>

            {/* 영역 정성 */}
            <div className="px-5 py-4 bg-gray-50 border-t">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {areaCode}영역 정성 평가
              </label>
              {submitDone ? (
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{qualitative[areaCode] || '—'}</p>
              ) : (
                <textarea
                  rows={3}
                  value={qualitative[areaCode] ?? ''}
                  onChange={e => handleQualChange(areaCode, e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="이 영역에 대한 정성 평가를 입력하세요."
                />
              )}
            </div>
          </section>
        )
      })}

      {/* 채점 결과 */}
      {(submitDone && result) && (
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 border-b px-5 py-3">
            <span className="font-semibold text-gray-700">채점 결과</span>
            <span className="ml-2 text-xs text-gray-500">
              산식: (원점수−1)÷6×100 → 영역 평균 × 배점÷100 → 합산 / 등급컷: A ≥85, B ≥75, 그 외 C
            </span>
          </div>
          <div className="p-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b">
                  <th className="text-left pb-2">영역</th>
                  <th className="text-right pb-2">배점</th>
                  <th className="text-right pb-2">영역 평균</th>
                  <th className="text-right pb-2">기여점수</th>
                </tr>
              </thead>
              <tbody>
                {activeAreas.map(a => (
                  <tr key={a} className="border-b last:border-0">
                    <td className="py-2">{a}. {getAreaName(a)}</td>
                    <td className="text-right text-gray-600">{weights[a]}</td>
                    <td className="text-right text-gray-600">{result.areaAverages[a]?.toFixed(1) ?? '—'}</td>
                    <td className="text-right font-medium">{result.areaScores[a]?.toFixed(2) ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-bold">
                  <td colSpan={3} className="pt-3">총점</td>
                  <td className="text-right pt-3">{result.totalScore.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
            <div className="mt-4 text-center">
              <span className="text-4xl font-bold text-blue-700">{result.grade}</span>
              <span className="ml-2 text-gray-500 text-sm">등급</span>
            </div>
          </div>
        </section>
      )}

      {/* 실시간 미리보기 (제출 전) */}
      {!submitDone && preview && (
        <div className="text-sm text-gray-500 text-right">
          현재 예상 총점: <span className="font-semibold text-gray-700">{preview.totalScore.toFixed(1)}</span>점
          <span className="ml-2 font-bold text-blue-600">{preview.grade}</span>등급
        </div>
      )}

      {/* 버튼 */}
      {!submitDone && (
        <div className="flex gap-3 justify-end">
          {error && <p className="text-sm text-red-600 self-center">{error}</p>}
          <button
            onClick={handleManualSave}
            disabled={saving}
            className="px-5 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {saving ? '저장 중...' : '임시저장'}
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            최종 제출
          </button>
        </div>
      )}
    </div>
  )
}
