'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  subjectId: string
  currentActivity: string | null
  instrument: string
}

const OPTIONS: Record<string, string[]> = {
  platform_foundation: ['플랫폼형', '사업형', '지원형'],
  platform_org: ['만남형', '제작형', '축제형', '공간형'],
  private_space_foundation: [],
}

export default function SubjectActivityEditor({ subjectId, currentActivity, instrument }: Props) {
  const router = useRouter()
  const options = OPTIONS[instrument] ?? []

  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(currentActivity ?? (options[0] ?? ''))
  const [loading, setLoading] = useState(false)

  if (options.length === 0) return null

  async function handleSave() {
    setLoading(true)
    const res = await fetch('/api/admin/update-subject-activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subjectId, activityType: value }),
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
        title="활동유형 변경"
      >
        {currentActivity ?? '활동유형 미설정'} ✎
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
