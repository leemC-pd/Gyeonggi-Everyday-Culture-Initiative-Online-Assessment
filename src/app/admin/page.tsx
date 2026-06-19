import Link from 'next/link'
import { createServiceClient as createClient } from '@/lib/supabase/service'

export default async function AdminDashboard() {
  const supabase = createClient()

  const [
    { count: subjectCount },
    { count: evalCount },
    { count: submittedCount },
    { count: evaluatorCount },
  ] = await Promise.all([
    supabase.from('subjects').select('*', { count: 'exact', head: true }),
    supabase.from('evaluations').select('*', { count: 'exact', head: true }),
    supabase.from('evaluations').select('*', { count: 'exact', head: true }).eq('status', 'submitted'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'evaluator'),
  ])

  const stats = [
    { label: '평가 대상', value: subjectCount ?? 0, href: '/admin/subjects' },
    { label: '평가위원', value: evaluatorCount ?? 0, href: '/admin/evaluators' },
    { label: '평가 진행 중', value: (evalCount ?? 0) - (submittedCount ?? 0), href: '/admin/progress' },
    { label: '제출 완료', value: submittedCount ?? 0, href: '/admin/progress' },
  ]

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-800 mb-6">관리자 대시보드</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map(s => (
          <Link key={s.label} href={s.href}
            className="bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-400 hover:shadow-sm transition">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className="text-3xl font-bold text-gray-800 mt-1">{s.value}</p>
          </Link>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Link href="/admin/subjects/new"
          className="bg-blue-600 text-white rounded-xl p-5 hover:bg-blue-700 transition">
          <p className="font-semibold">+ 평가 대상 등록</p>
          <p className="text-sm text-blue-100 mt-1">새 기관/단체/공간을 등록하고 위원을 배정합니다</p>
        </Link>
        <Link href="/admin/progress"
          className="bg-white border border-gray-200 rounded-xl p-5 hover:border-blue-400 hover:shadow-sm transition">
          <p className="font-semibold text-gray-800">진행상황 확인</p>
          <p className="text-sm text-gray-500 mt-1">대상별 평가 진행·제출 상태를 확인합니다</p>
        </Link>
      </div>
    </div>
  )
}
