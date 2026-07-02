'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface RowResult {
  row: number
  name: string
  status: 'ok' | 'error'
  message: string
}

export default function UploadStagePage() {
  const ref = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState('')
  const [results, setResults] = useState<RowResult[]>([])

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    setSummary('')
    setResults([])
    const form = new FormData()
    form.append('file', file)
    const res = await fetch('/api/admin/upload-stage', { method: 'POST', body: form })
    const data = await res.json()
    if (data.ok) {
      setSummary(`적용 ${data.applied}건 · 성공 ${data.okCount} · 오류 ${data.errCount}`)
      setResults(data.results ?? [])
      router.refresh()
    } else {
      setSummary(`오류: ${data.error}`)
    }
    setLoading(false)
    if (ref.current) ref.current.value = ''
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/subjects" className="text-gray-400 hover:text-gray-600 text-sm">← 목록</Link>
        <h1 className="text-xl font-bold text-gray-800">진입/성장 단계 일괄 업로드</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h2 className="font-semibold text-gray-700 mb-2">엑셀 형식</h2>
        <p className="text-sm text-gray-600 mb-3">첫 번째 시트, 2행부터 데이터를 읽습니다.</p>
        <table className="w-full text-xs border border-gray-200 mb-3">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="border px-2 py-1 text-left">A: 대상명 *</th>
              <th className="border px-2 py-1 text-left">B: 진단지 (선택)</th>
              <th className="border px-2 py-1 text-left">C: 단계 *</th>
            </tr>
          </thead>
          <tbody className="text-gray-700">
            <tr>
              <td className="border px-2 py-1">고양문화재단</td>
              <td className="border px-2 py-1">재단</td>
              <td className="border px-2 py-1">성장</td>
            </tr>
            <tr>
              <td className="border px-2 py-1">문화예술교육공동체 탐</td>
              <td className="border px-2 py-1">단체</td>
              <td className="border px-2 py-1">진입</td>
            </tr>
          </tbody>
        </table>
        <ul className="text-xs text-gray-500 space-y-1 list-disc pl-4">
          <li>대상명은 시스템에 등록된 이름과 정확히 일치해야 합니다.</li>
          <li>단계는 <b>진입</b> 또는 <b>성장</b>만 허용 (민간공간은 단계 없음 → 제외).</li>
          <li>같은 이름의 대상이 여러 개면 B열에 진단지(재단/단체)를 지정하세요.</li>
        </ul>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <input ref={ref} type="file" accept=".xlsx" className="hidden" onChange={handleFile} />
        <button
          onClick={() => ref.current?.click()}
          disabled={loading}
          className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? '업로드 중...' : '엑셀 파일 선택'}
        </button>
        {summary && <span className="text-sm text-gray-700 font-medium">{summary}</span>}
      </div>

      {results.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b text-xs text-gray-500">
              <tr>
                <th className="text-left px-4 py-2">행</th>
                <th className="text-left px-4 py-2">대상명</th>
                <th className="text-left px-4 py-2">결과</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {results.map((r, i) => (
                <tr key={i} className={r.status === 'error' ? 'bg-red-50' : ''}>
                  <td className="px-4 py-2 text-gray-400">{r.row}</td>
                  <td className="px-4 py-2 text-gray-800">{r.name || '—'}</td>
                  <td className={`px-4 py-2 ${r.status === 'error' ? 'text-red-600' : 'text-green-700'}`}>
                    {r.message}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
