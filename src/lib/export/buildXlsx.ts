import ExcelJS from 'exceljs'
import { getAreaName, AREA_CODES } from '@/lib/instruments'
import type { SubjectExportRow } from './fetchData'

export async function buildScoreXlsx(rows: SubjectExportRow[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  wb.creator = '2026 생활문화 평가시스템'
  wb.created = new Date()

  // ── 시트1: 점수표 ──────────────────────────────────────────
  const ws = wb.addWorksheet('점수표')

  // 산식·등급컷 메모 행
  ws.addRow(['[채점 산식] 문항 환산: (원점수−1)÷6×100 → 영역점수: 평균 × 배점÷100 → 총점: 합산(만점 100)'])
  ws.addRow(['[등급컷] A: 총점 > 85점  /  B: 총점 > 75점  /  그 외 C'])
  ws.addRow([])

  // 헤더
  const headerRow = ws.addRow([
    '기관명', '진단지', '단계', '대상모델', '평가위원',
    ...AREA_CODES.map(a => `${a}.${getAreaName(a)}\n(배점)`),
    ...AREA_CODES.map(a => `${a}.${getAreaName(a)}\n(기여점수)`),
    '총점', '등급', '합의여부',
  ])
  headerRow.font = { bold: true }
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F0FE' } }
  headerRow.alignment = { wrapText: true, vertical: 'middle' }
  headerRow.height = 36

  // 배점 보조 행
  const firstRow = rows[0]
  if (firstRow) {
    const weightRow = ws.addRow([
      '', '', '', '', '',
      ...AREA_CODES.map(a => firstRow.areaWeights[a] ?? '—'),
      ...AREA_CODES.map(() => ''),
      '', '', '',
    ])
    weightRow.font = { italic: true, color: { argb: 'FF888888' } }
    weightRow.getCell(1).value = '(배점)'
  }

  // 데이터 행
  for (const row of rows) {
    const dataRow = ws.addRow([
      row.subjectName,
      row.instrumentName,
      row.stage ?? '—',
      row.targetModel ?? '—',
      row.evaluatorName,
      ...AREA_CODES.map(a => row.areaWeights[a] ?? 0),
      ...AREA_CODES.map(a => row.areaScores[a] != null ? +row.areaScores[a].toFixed(2) : '—'),
      row.totalScore != null ? +row.totalScore.toFixed(2) : '—',
      row.grade ?? '—',
      row.isReconciled ? '합의' : '',
    ])

    // 등급 셀 색상
    const gradeCell = dataRow.getCell(5 + AREA_CODES.length * 2 + 2)
    if (row.grade === 'A') gradeCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBFEFBF' } }
    else if (row.grade === 'B') gradeCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF0B3' } }
    else if (row.grade === 'C') gradeCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC1C1' } }
    gradeCell.font = { bold: true }
    gradeCell.alignment = { horizontal: 'center' }
  }

  // 열 너비
  ws.getColumn(1).width = 22
  ws.getColumn(2).width = 20
  ws.getColumn(3).width = 8
  ws.getColumn(4).width = 12
  ws.getColumn(5).width = 10
  for (let i = 6; i <= 5 + AREA_CODES.length * 2 + 3; i++) {
    ws.getColumn(i).width = 10
  }

  // 상단 1~2행 스타일
  ws.getRow(1).font = { color: { argb: 'FF444444' }, italic: true, size: 9 }
  ws.getRow(2).font = { color: { argb: 'FF444444' }, italic: true, size: 9 }

  // ── 시트2: 영역별 평균(0~100) 참고표 ─────────────────────
  const ws2 = wb.addWorksheet('영역평균(참고)')
  ws2.addRow(['※ 영역 배점이 다른 진단지 간 총점 직접 비교는 부적절합니다. 이 시트는 영역 평균(0~100) 기준 참고용입니다.'])
  ws2.getRow(1).font = { color: { argb: 'FFAA4400' }, italic: true, size: 9 }
  ws2.addRow([])

  const h2 = ws2.addRow([
    '기관명', '진단지',
    ...AREA_CODES.map(a => `${a}.${getAreaName(a)}`),
  ])
  h2.font = { bold: true }
  h2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3E0' } }

  for (const row of rows) {
    ws2.addRow([
      row.subjectName,
      row.instrumentName,
      ...AREA_CODES.map(a => row.areaAverages[a] != null ? +row.areaAverages[a].toFixed(1) : '—'),
    ])
  }

  ws2.getColumn(1).width = 22
  ws2.getColumn(2).width = 20
  for (let i = 3; i <= 2 + AREA_CODES.length; i++) ws2.getColumn(i).width = 11

  const buf = await wb.xlsx.writeBuffer()
  return Buffer.from(buf)
}
