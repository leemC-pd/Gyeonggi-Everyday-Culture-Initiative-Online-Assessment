import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import ExcelJS from 'exceljs'

type InstrumentType = 'platform_foundation' | 'platform_org' | 'private_space_foundation'

const INSTRUMENT_ALIASES: Record<string, InstrumentType> = {
  '재단': 'platform_foundation',
  '기초재단': 'platform_foundation',
  '플랫폼-재단': 'platform_foundation',
  'platform_foundation': 'platform_foundation',
  '단체': 'platform_org',
  '유관기관': 'platform_org',
  '유관기관·단체': 'platform_org',
  '플랫폼-단체': 'platform_org',
  'platform_org': 'platform_org',
  '민간공간': 'private_space_foundation',
  'private_space_foundation': 'private_space_foundation',
}

function cellText(val: ExcelJS.CellValue): string {
  if (val === null || val === undefined) return ''
  if (typeof val === 'string') return val.trim()
  if (typeof val === 'number') return String(val)
  if (typeof val === 'object' && 'richText' in (val as object)) {
    return ((val as { richText: { text: string }[] }).richText).map(r => r.text).join('').trim()
  }
  if (typeof val === 'object' && 'text' in (val as object)) {
    return ((val as { text: string }).text).trim()
  }
  return String(val).trim()
}

async function checkAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const service = createServiceClient()
  const { data: profile } = await service.from('profiles').select('role').eq('id', user.id).single()
  return profile?.role === 'admin' ? user : null
}

export async function POST(request: NextRequest) {
  const user = await checkAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const formData = await request.formData()
  const file = formData.get('file') as File
  if (!file) return NextResponse.json({ error: '파일 없음' }, { status: 400 })

  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(await file.arrayBuffer())
  const sheet = wb.worksheets[0]
  if (!sheet) return NextResponse.json({ error: '시트를 찾을 수 없습니다' }, { status: 400 })

  const service = createServiceClient()
  const { data: subjects } = await service.from('subjects').select('id, name, instrument, stage')
  const allSubjects = subjects ?? []

  // 컬럼: A=대상명(name), B=진단지(선택), C=단계(진입/성장)
  const results: { row: number; name: string; status: 'ok' | 'error'; message: string }[] = []
  const changes: { subject_id: string; name: string; from: string | null; to: string }[] = []

  const pending: { rowNo: number; name: string; instrumentHint: InstrumentType | null; stage: string }[] = []
  sheet.eachRow((row, i) => {
    if (i < 2) return // 헤더
    const name = cellText(row.getCell(1).value)
    const instrRaw = cellText(row.getCell(2).value)
    const stage = cellText(row.getCell(3).value)
    if (!name && !stage) return
    pending.push({ rowNo: i, name, instrumentHint: INSTRUMENT_ALIASES[instrRaw] ?? null, stage })
  })

  if (!pending.length) return NextResponse.json({ error: '유효한 행이 없습니다 (2행부터 데이터)' }, { status: 400 })

  for (const p of pending) {
    if (!p.name) { results.push({ row: p.rowNo, name: '', status: 'error', message: '대상명 누락' }); continue }
    if (p.stage !== '진입' && p.stage !== '성장') {
      results.push({ row: p.rowNo, name: p.name, status: 'error', message: `단계 값 오류: "${p.stage}" (진입/성장만 허용)` })
      continue
    }
    let matches = allSubjects.filter(s => s.name === p.name)
    if (p.instrumentHint) matches = matches.filter(s => s.instrument === p.instrumentHint)
    matches = matches.filter(s => s.instrument !== 'private_space_foundation') // 민간공간은 단계 없음

    if (matches.length === 0) {
      results.push({ row: p.rowNo, name: p.name, status: 'error', message: '일치하는 평가대상 없음 (또는 민간공간)' })
      continue
    }
    if (matches.length > 1) {
      results.push({ row: p.rowNo, name: p.name, status: 'error', message: '동일 이름 대상이 여러 개 — B열에 진단지 지정 필요' })
      continue
    }
    const subject = matches[0]
    changes.push({ subject_id: subject.id, name: subject.name, from: subject.stage, to: p.stage })
    results.push({ row: p.rowNo, name: p.name, status: 'ok', message: `${subject.stage ?? '미설정'} → ${p.stage}` })
  }

  // 적용
  for (const c of changes) {
    await service.from('subjects').update({ stage: c.to, updated_at: new Date().toISOString() }).eq('id', c.subject_id)
  }

  // 로그 기록 (테이블 없으면 조용히 무시)
  if (changes.length) {
    await service.from('stage_upload_logs').insert({
      admin_id: user.id,
      filename: file.name,
      changes,
    })
  }

  const okCount = results.filter(r => r.status === 'ok').length
  const errCount = results.filter(r => r.status === 'error').length
  return NextResponse.json({ ok: true, applied: changes.length, okCount, errCount, results })
}
