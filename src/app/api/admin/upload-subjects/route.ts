import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import ExcelJS from 'exceljs'

type InstrumentType = 'platform_foundation' | 'platform_org' | 'private_space_foundation'
type OperationStage = '진입' | '성장'

function mapInstrument(type: string, subject: string): InstrumentType | null {
  if (type === '플랫폼' && subject === '기초재단') return 'platform_foundation'
  if (type === '플랫폼') return 'platform_org'
  if (type === '민간공간') return 'private_space_foundation'
  return null
}

function cellText(val: ExcelJS.CellValue): string {
  if (!val) return ''
  if (typeof val === 'string') return val.trim()
  if (typeof val === 'number') return String(val)
  if (typeof val === 'object' && 'text' in (val as object)) return ((val as { text: string }).text).trim()
  if (typeof val === 'object' && 'richText' in (val as object)) {
    return ((val as { richText: { text: string }[] }).richText).map(r => r.text).join('').trim()
  }
  return String(val).trim()
}

export async function POST(request: NextRequest) {
  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: { user } } = await service.auth.getUser(
    request.headers.get('authorization')?.replace('Bearer ', '') ?? ''
  )

  const formData = await request.formData()
  const file = formData.get('file') as File
  if (!file) return NextResponse.json({ error: '파일 없음' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(buffer)

  const sheet = wb.getWorksheet('종합표')
  if (!sheet) return NextResponse.json({ error: '종합표 시트를 찾을 수 없습니다' }, { status: 400 })

  const rows: {
    name: string
    instrument: InstrumentType
    stage: OperationStage | null
    fiscal_year: '신규' | '연속' | null
    notes: string
  }[] = []

  sheet.eachRow((row, i) => {
    if (i < 2) return
    const name = cellText(row.getCell(3).value)
    const projectName = cellText(row.getCell(4).value)
    const region = cellText(row.getCell(5).value)
    const typeStr = cellText(row.getCell(6).value)
    const subjectStr = cellText(row.getCell(7).value)
    const stageStr = cellText(row.getCell(9).value)
    const amount = row.getCell(11).value

    if (!name || !typeStr) return

    const instrument = mapInstrument(typeStr, subjectStr)
    if (!instrument) return

    const stage = (stageStr === '진입' || stageStr === '성장') ? stageStr as OperationStage : null
    const fiscal_year = instrument === 'private_space_foundation'
      ? (stageStr === '신규' || stageStr === '연속' ? stageStr as '신규' | '연속' : null)
      : null

    const notes = [
      projectName && `사업명: ${projectName}`,
      region && `지역: ${region}`,
      amount && `지원금액: ${Number(amount).toLocaleString()}원`,
    ].filter(Boolean).join(' | ')

    rows.push({ name, instrument, stage, fiscal_year, notes })
  })

  if (!rows.length) return NextResponse.json({ error: '유효한 데이터가 없습니다' }, { status: 400 })

  let inserted = 0, updated = 0

  for (const row of rows) {
    const { data: existing } = await service
      .from('subjects')
      .select('id')
      .eq('name', row.name)
      .eq('instrument', row.instrument)
      .maybeSingle()

    if (existing) {
      await service.from('subjects').update({
        stage: row.stage,
        fiscal_year: row.fiscal_year,
        notes: row.notes,
        updated_at: new Date().toISOString(),
      }).eq('id', existing.id)
      updated++
    } else {
      await service.from('subjects').insert(row)
      inserted++
    }
  }

  return NextResponse.json({ ok: true, inserted, updated, total: rows.length })
}
