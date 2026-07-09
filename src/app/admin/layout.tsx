import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import LogoutButton from './LogoutButton'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: profile } = await service
    .from('profiles')
    .select('role, name')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin' && profile?.role !== 'viewer') redirect('/')
  const isViewer = profile?.role === 'viewer'

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-3 flex items-center justify-between print:hidden">
        <div className="flex items-center gap-6">
          <Link href="/admin" className="font-bold text-gray-800 text-sm">관리자</Link>
          {isViewer && <span className="text-[11px] font-medium text-amber-700 bg-amber-100 rounded-full px-2 py-0.5">열람 전용</span>}
          <nav className="flex gap-4 text-sm">
            <Link href="/admin" className="text-gray-600 hover:text-blue-600">대시보드</Link>
            <Link href="/admin/subjects" className="text-gray-600 hover:text-blue-600">평가대상</Link>
            <Link href="/admin/evaluators" className="text-gray-600 hover:text-blue-600">평가위원</Link>
            <Link href="/admin/progress" className="text-gray-600 hover:text-blue-600">진행상황</Link>
            <Link href="/admin/export" className="text-gray-600 hover:text-blue-600">내보내기</Link>
            <Link href="/admin/instruments" className="text-gray-600 hover:text-blue-600">진단지편집</Link>
            <Link href="/preview/platform_foundation" className="text-gray-600 hover:text-blue-600">미리보기(플랫폼·재단)</Link>
            <Link href="/preview/platform_org" className="text-gray-600 hover:text-blue-600">미리보기(플랫폼·단체)</Link>
            <Link href="/preview/private_space_foundation" className="text-gray-600 hover:text-blue-600">미리보기(공간활성화)</Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">{profile?.name ?? user.email}</span>
          <LogoutButton />
        </div>
      </header>
      <div className="max-w-5xl mx-auto px-4 py-8">{children}</div>
    </div>
  )
}
