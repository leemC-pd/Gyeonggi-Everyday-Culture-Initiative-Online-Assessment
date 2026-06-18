import type { CrossCheckEntry } from '@/types'

interface OperatorData {
  spaceName: string
  responses: Record<string, string> | null
}

function mismatchHighlight(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) return false
  return a !== b
}

// 운영자 응답 집계 (다수 공간의 최빈값)
function aggregate(ops: OperatorData[], qKey: string): string {
  const vals = ops.map(o => o.responses?.[qKey]).filter(Boolean) as string[]
  if (!vals.length) return '—'
  const freq: Record<string, number> = {}
  for (const v of vals) freq[v] = (freq[v] ?? 0) + 1
  return Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0]
}

export default function CrossCheckTable({
  crossCheckMap,
  foundationResponses,
  operatorAssessments,
}: {
  crossCheckMap: CrossCheckEntry[]
  foundationResponses: Record<string, string>
  operatorAssessments: OperatorData[]
}) {
  const submitted = operatorAssessments.filter(o => o.responses)
  const total = operatorAssessments.length

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">
        운영자 응답: <b>{submitted.length}/{total}</b>건 수집
        {submitted.length < total && (
          <span className="ml-2 text-yellow-600">미제출 공간의 응답은 집계에서 제외됩니다.</span>
        )}
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50 text-xs text-gray-500 border-b">
              <th className="text-left px-3 py-2">확인 항목</th>
              <th className="text-left px-3 py-2">재단 응답</th>
              <th className="text-left px-3 py-2">운영자 집계</th>
              <th className="text-left px-3 py-2">판정 연결 문항</th>
              <th className="text-left px-3 py-2">비고</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {crossCheckMap.map((entry, i) => {
              const foundationVals = entry.foundation.map(q => foundationResponses[q] ?? '—').join(' / ')
              const operatorAgg = entry.operator.map(q => {
                if (submitted.length === 0) return '—'
                return aggregate(submitted, q)
              }).join(' / ')

              const hasMismatch = entry.foundation.some((fq, idx) => {
                const oq = entry.operator[idx]
                if (!oq) return false
                const fVal = foundationResponses[fq]
                const oVal = aggregate(submitted, oq)
                return mismatchHighlight(fVal, oVal)
              })

              const evaluatorItem = Array.isArray(entry.evaluatorItem)
                ? entry.evaluatorItem.join(', ')
                : entry.evaluatorItem

              return (
                <tr key={i} className={hasMismatch ? 'bg-red-50' : ''}>
                  <td className="px-3 py-2 font-medium text-gray-700">{entry.fact}</td>
                  <td className="px-3 py-2 text-gray-700">{foundationVals}</td>
                  <td className={`px-3 py-2 ${hasMismatch ? 'font-semibold text-red-700' : 'text-gray-700'}`}>
                    {operatorAgg}
                    {hasMismatch && <span className="ml-1 text-xs">⚠ 불일치</span>}
                  </td>
                  <td className="px-3 py-2 text-blue-700 font-mono text-xs">{evaluatorItem}</td>
                  <td className="px-3 py-2 text-xs text-gray-400">{entry.rule ?? ''}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* 공간별 상세 */}
      {submitted.length > 0 && (
        <details className="mt-2">
          <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">공간별 응답 상세 보기</summary>
          <div className="mt-3 overflow-x-auto">
            <table className="text-xs w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b text-gray-500">
                  <th className="text-left px-2 py-1">공간명</th>
                  {crossCheckMap.flatMap(e => e.operator).map(q => (
                    <th key={q} className="text-left px-2 py-1">{q}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {submitted.map((o, i) => (
                  <tr key={i}>
                    <td className="px-2 py-1 font-medium">{o.spaceName}</td>
                    {crossCheckMap.flatMap(e => e.operator).map(q => (
                      <td key={q} className="px-2 py-1 text-gray-600">{o.responses?.[q] ?? '—'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  )
}
