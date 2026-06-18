import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, name')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/')

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/admin" className="font-bold text-gray-800 text-sm">관리자</Link>
          <nav className="flex gap-4 text-sm">
            <Link href="/admin" className="text-gray-600 hover:text-blue-600">대시보드</Link>
            <Link href="/admin/subjects" className="text-gray-600 hover:text-blue-600">평가 대상</Link>
            <Link href="/admin/progress" className="text-gray-600 hover:text-blue-600">진행상황</Link>
          </nav>
        </div>
        <span className="text-xs text-gray-500">{profile?.name ?? user.email}</span>
      </header>
      <div className="max-w-5xl mx-auto px-4 py-8">{children}</div>
    </div>
  )
}
