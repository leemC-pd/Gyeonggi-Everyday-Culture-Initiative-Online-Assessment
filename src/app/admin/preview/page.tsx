import Link from 'next/link'

const INSTRUMENTS = [
  { id: 'platform_foundation', label: '플랫폼 — 재단', sub: '27문항 · 진입/성장' },
  { id: 'platform_org', label: '플랫폼 — 단체', sub: '25문항 · 진입/성장' },
  { id: 'private_space_foundation', label: '공간활성화 — 재단', sub: '21문항 · 단일' },
]

export default function PreviewIndexPage() {
  return (
    <div>
      <h1 className="text-xl font-bold text-gray-800 mb-6">진단지 미리보기</h1>
      <div className="space-y-3">
        {INSTRUMENTS.map(inst => (
          <Link
            key={inst.id}
            href={`/preview/${inst.id}`}
            className="block bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-400 hover:shadow-sm transition"
          >
            <p className="font-medium text-gray-800">{inst.label}</p>
            <p className="text-xs text-gray-500 mt-1">{inst.sub}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
