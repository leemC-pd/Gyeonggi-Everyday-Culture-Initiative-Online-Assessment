'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function UploadButton() {
  const ref = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState('')

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    setResult('')
    const form = new FormData()
    form.append('file', file)
    const res = await fetch('/api/admin/upload-subjects', { method: 'POST', body: form })
    const data = await res.json()
    if (data.ok) {
      setResult(`완료: ${data.inserted}건 신규 등록, ${data.updated}건 업데이트 (총 ${data.total}건)`)
      router.refresh()
    } else {
      setResult(`오류: ${data.error}`)
    }
    setLoading(false)
    if (ref.current) ref.current.value = ''
  }

  return (
    <div className="flex items-center gap-3">
      <input ref={ref} type="file" accept=".xlsx" className="hidden" onChange={handleFile} />
      <button
        onClick={() => ref.current?.click()}
        disabled={loading}
        className="border border-gray-300 text-gray-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
      >
        {loading ? '업로드 중...' : '엑셀 업로드'}
      </button>
      {result && <span className="text-sm text-gray-600">{result}</span>}
    </div>
  )
}
