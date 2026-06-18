'use client'

import { useState } from 'react'

export default function ExportButtons({ type, label }: { type: 'scores' | 'qualitative'; label: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleDownload() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/export/${type}`)
      if (!res.ok) throw new Error(await res.text())
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const cd = res.headers.get('Content-Disposition') ?? ''
      const match = cd.match(/filename\*=UTF-8''(.+)/)
      a.download = match ? decodeURIComponent(match[1]) : `export.${type === 'scores' ? 'xlsx' : 'docx'}`
      a.href = url
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError(String(e))
    }
    setLoading(false)
  }

  return (
    <div>
      <button
        onClick={handleDownload}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? '생성 중...' : label}
      </button>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
    </div>
  )
}
