import Link from 'next/link'

const INSTRUMENTS = [
  { id: 'platform_foundation', label: '플랫폼 사업 — 기초재단' },
  { id: 'platform_org', label: '플랫폼 사업 — 민간단체' },
  { id: 'private_space_foundation', label: '민간공간 — 기초재단' },
]

export default function InstrumentsPage() {
  return (
    <div>
      <h1 className="text-xl font-bold text-gray-800 mb-6">진단지 편집</h1>
      <div className="space-y-3">
        {INSTRUMENTS.map(inst => (
          <Link
            key={inst.id}
            href={`/admin/instruments/${inst.id}`}
            className="block bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-400 hover:shadow-sm transition"
          >
            <p className="font-medium text-gray-800">{inst.label}</p>
            <p className="text-xs text-gray-500 mt-1">문항 추가·삭제·문구 수정</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
