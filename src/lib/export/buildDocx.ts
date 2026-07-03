import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  Table, TableRow, TableCell, WidthType, AlignmentType,
  BorderStyle, ShadingType,
} from 'docx'
import { getAreaName, AREA_CODES } from '@/lib/instruments'
import type { SubjectExportRow } from './fetchData'

function cell(text: string, opts: { bold?: boolean; shade?: boolean; width?: number } = {}) {
  return new TableCell({
    width: opts.width ? { size: opts.width, type: WidthType.DXA } : undefined,
    shading: opts.shade ? { type: ShadingType.SOLID, color: 'E8F0FE' } : undefined,
    children: [new Paragraph({
      children: [new TextRun({ text, bold: opts.bold, size: 20 })],
    })],
  })
}

function scoreTable(row: SubjectExportRow) {
  const header = new TableRow({
    children: [
      cell('영역', { bold: true, shade: true, width: 1800 }),
      cell('배점', { bold: true, shade: true, width: 900 }),
      cell('영역 평균', { bold: true, shade: true, width: 1200 }),
      cell('기여점수', { bold: true, shade: true, width: 1200 }),
    ],
  })

  const areaRows = AREA_CODES
    .filter(a => row.areaWeights[a] != null)
    .map(a => new TableRow({
      children: [
        cell(`${a}. ${getAreaName(a)}`),
        cell(String(row.areaWeights[a] ?? '—')),
        cell(row.areaAverages[a] != null ? row.areaAverages[a].toFixed(1) : '—'),
        cell(row.areaScores[a] != null ? row.areaScores[a].toFixed(2) : '—'),
      ],
    }))

  const totalRow = new TableRow({
    children: [
      cell('총점', { bold: true }),
      cell('100', { bold: true }),
      cell(''),
      cell(row.totalScore != null ? row.totalScore.toFixed(2) : '—', { bold: true }),
    ],
  })

  return new Table({
    width: { size: 5200, type: WidthType.DXA },
    rows: [header, ...areaRows, totalRow],
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1 },
      bottom: { style: BorderStyle.SINGLE, size: 1 },
      left: { style: BorderStyle.SINGLE, size: 1 },
      right: { style: BorderStyle.SINGLE, size: 1 },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
      insideVertical: { style: BorderStyle.SINGLE, size: 1 },
    },
  })
}

export async function buildQualDocx(rows: SubjectExportRow[]): Promise<Buffer> {
  const children: (Paragraph | Table)[] = []

  // 제목
  children.push(
    new Paragraph({
      text: '2026 생활문화플랫폼·민간공간 평가 — 정성 취합',
      heading: HeadingLevel.TITLE,
    }),
    new Paragraph({
      children: [new TextRun({
        text: `채점 산식: (원점수−1)÷6×100 → 영역 평균×배점÷100 → 합산(만점 100) | 등급컷: A≥85, B≥75, 그 외 C`,
        size: 18, color: '666666', italics: true,
      })],
    }),
    new Paragraph({ text: '' }),
  )

  for (const row of rows) {
    // 기관명 헤딩
    children.push(
      new Paragraph({
        text: row.subjectName,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: row.instrumentName, size: 20, color: '555555' }),
          new TextRun({ text: row.stage ? `  ·  ${row.stage}단계` : '', size: 20, color: '555555' }),
          new TextRun({ text: `  ·  평가위원: ${row.evaluatorName}`, size: 20, color: '555555' }),
          ...(row.isReconciled ? [new TextRun({ text: '  ·  [합의]', size: 20, bold: true, color: '1A56DB' })] : []),
        ],
      }),
    )

    // 점수 요약 테이블
    children.push(
      new Paragraph({ text: '' }),
      scoreTable(row),
      new Paragraph({
        children: [new TextRun({
          text: `총점: ${row.totalScore?.toFixed(2) ?? '—'}점  /  등급: ${row.grade ?? '—'}`,
          bold: true, size: 24,
        })],
        alignment: AlignmentType.RIGHT,
        spacing: { before: 80 },
      }),
    )

    if (row.isReconciled && row.reconciliationReason) {
      children.push(new Paragraph({
        children: [new TextRun({ text: `합의 사유: ${row.reconciliationReason}`, size: 20, color: '1A56DB' })],
        spacing: { before: 60 },
      }))
    }

    // 영역별 정성
    children.push(new Paragraph({ text: '' }))
    for (const a of AREA_CODES) {
      const text = row.qualitative[a]
      if (!text) continue
      children.push(
        new Paragraph({
          children: [new TextRun({ text: `${a}. ${getAreaName(a)}`, bold: true, size: 22 })],
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200 },
        }),
        new Paragraph({
          children: [new TextRun({ text: text || '(입력 없음)', size: 20 })],
        }),
      )
    }

    // 총평
    if (row.qualitative['overall']) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: '총평', bold: true, size: 22 })],
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200 },
        }),
        new Paragraph({
          children: [new TextRun({ text: row.qualitative['overall'], size: 20 })],
        }),
      )
    }

    children.push(new Paragraph({ text: '', pageBreakBefore: rows.indexOf(row) < rows.length - 1 }))
  }

  const doc = new Document({ sections: [{ children }] })
  return Packer.toBuffer(doc)
}
