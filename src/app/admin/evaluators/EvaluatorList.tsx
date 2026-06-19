'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Evaluator {
  id: string
  name: string
  email: string
  created_at: string
}

export default function EvaluatorList({ evaluators }: { evaluators: Evaluator[] }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function handleAdd() {
    if (!name.trim() || !email.trim()) return
    setLoading(true)
    setMessage('')
    const res = await fetch('/api/admin/create-evaluator', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), email: email.trim() }),
    })
    const data = await res.json()
    if (data.ok) {
      setMessage(`${name} 등록 완료. 로그인 링크가 이메일로 발송됩니다.`)
      setName('')
      setEmail('')
      router.refresh()
    } else {
      setMessage(`오류: ${data.error}`)
    }
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      {/* 등록 폼 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-700 mb-4">새 평가위원 등록</h2>
        <div className="flex gap-3 flex-wrap">
          <input
            type="text"
            placeholder="이름"
            value={name}
            onChange={e => setName(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleAdd}
            disabled={loading || !name || !email}
            className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '등록 중...' : '+ 등록'}
          </button>
        </div>
        {message && <p className="mt-3 text-sm text-gray-600">{message}</p>}
      </div>

      {/* 목록 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {evaluators.length === 0 ? (
          <p className="text-sm text-gray-500 p-5">등록된 평가위원이 없습니다.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b text-xs text-gray-500">
              <tr>
                <th className="text-left px-4 py-3">이름</th>
                <th className="text-left px-4 py-3">이메일</th>
                <th className="text-left px-4 py-3">등록일</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {evaluators.map(e => (
                <tr key={e.id}>
                  <td className="px-4 py-3 font-medium text-gray-800">{e.name}</td>
                  <td className="px-4 py-3 text-gray-600">{e.email}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{new Date(e.created_at).toLocaleDateString('ko-KR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
