'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  subjectId: string
  currentStage: string | null
  instrument: string
}

const STAGES = ['진입', '성장']
const FISCAL_YEARS = ['신규', '연속']

export default function SubjectStageEditor({ subjectId, currentStage, instrument }: Props) {
  const router = useRouter()
  const isPrivate = instrument === 'private_space_foundation'
  const options = isPrivate ? FISCAL_YEARS : STAGES

  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(currentStage ?? options[0])
  const [loading, setLoading] = useState(false)

  async function handleSave() {
    setLoading(true)
    const res = await fetch('/api/admin/update-subject-stage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subjectId, stage: isPrivate ? null : value, fiscalYear: isPrivate ? value : null }),
    })
    setLoading(false)
    if (res.ok) {
      setEditing(false)
      router.refresh()
    }
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="text-xs text-blue-500 hover:text-blue-700 underline ml-1"
        title="성장단계 변경"
      >
        {currentStage ?? '단계미설정'} ✎
      </button>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 ml-1">
      <select
        value={value}
        onChange={e => setValue(e.target.value)}
        className="text-xs border border-gray-300 rounded px-1 py-0.5"
      >
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <button
        onClick={handleSave}
        disabled={loading}
        className="text-xs text-white bg-blue-600 rounded px-2 py-0.5 hover:bg-blue-700 disabled:opacity-50"
      >
        저장
      </button>
      <button
        onClick={() => setEditing(false)}
        className="text-xs text-gray-500 hover:text-gray-700"
      >
        취소
      </button>
    </span>
  )
}
