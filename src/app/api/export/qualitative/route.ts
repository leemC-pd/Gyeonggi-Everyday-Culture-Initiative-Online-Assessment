import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchExportData } from '@/lib/export/fetchData'
import { buildQualDocx } from '@/lib/export/buildDocx'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const rows = await fetchExportData()
  const buf = await buildQualDocx(rows)

  const filename = `정성취합_${new Date().toISOString().slice(0, 10)}.docx`
  return new NextResponse(buf as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  })
}
