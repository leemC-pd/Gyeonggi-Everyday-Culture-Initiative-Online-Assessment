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
  if (typeof val === 'object' && 'richText' in (val as object)) {
    return ((val as { richText: { text: string }[] }).richText).map(r => r.text).join('').trim()
  }
  if (typeof val === 'object' && 'text' in (val as object)) {
    return ((val as { text: string }).text).trim()
  }
  return String(val).trim()
}

export async function POST(request: NextRequest) {
  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const formData = await request.formData()
  const file = formData.get('file') as File
  if (!file) return NextResponse.json({ error: '파일 없음' }, { status: 400 })

  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(await file.arrayBuffer())

  const sheet = wb.getWorksheet('종합표')
  if (!sheet) return NextResponse.json({ error: '종합표 시트를 찾을 수 없습니다' }, { status: 400 })

  // 종합표 컬럼: A=ID, B=신청단체, C=사업명, D=지역, E=진단유형, F=주체유형, G=활동유형, H=성장단계, I=참여이력, J=평가위원
  const rows: {
    name: string
    title: string
    instrument: InstrumentType
    stage: OperationStage | null
    fiscal_year: '신규' | '연속' | null
    activity_type: string | null
    history: string | null
    notes: string
  }[] = []

  sheet.eachRow((row, i) => {
    if (i < 2) return  // 헤더 제외
    const name = cellText(row.getCell(2).value)   // B: 신청단체
    const title = cellText(row.getCell(3).value)  // C: 사업명
    const region = cellText(row.getCell(4).value) // D: 지역
    const typeStr = cellText(row.getCell(5).value)   // E: 진단유형
    const subjectStr = cellText(row.getCell(6).value) // F: 주체유형
    const activityStr = cellText(row.getCell(7).value) // G: 활동유형
    const stageStr = cellText(row.getCell(8).value)   // H: 성장단계
    const historyStr = cellText(row.getCell(9).value) // I: 참여이력
    const evaluatorStr = cellText(row.getCell(10).value) // J: 평가위원

    if (!name || !typeStr) return

    const instrument = mapInstrument(typeStr, subjectStr)
    if (!instrument) return

    const stage = (stageStr === '진입' || stageStr === '성장') ? stageStr as OperationStage : null
    const fiscal_year = instrument === 'private_space_foundation'
      ? (stageStr === '신규' || stageStr === '연속' ? stageStr as '신규' | '연속' : null)
      : null

    const notes = [
      region && `지역: ${region}`,
      evaluatorStr && `평가위원: ${evaluatorStr}`,
    ].filter(Boolean).join(' | ')

    rows.push({ name, title, instrument, stage, fiscal_year, activity_type: activityStr || null, history: historyStr || null, notes })
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
        title: row.title,
        stage: row.stage,
        fiscal_year: row.fiscal_year,
        activity_type: row.activity_type,
        history: row.history,
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
