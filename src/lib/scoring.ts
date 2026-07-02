import type { Instrument, Item, ScoringResult } from '@/types'

// 문항 환산: (raw - 1) / 6 * 100  →  ⑦=100, ④=50, ①=0
export function normalizeScore(raw: number): number {
  return ((raw - 1) / 6) * 100
}

// 대상의 단계/연차에 따라 이 문항이 적용되는지 판단
export function itemApplies(item: Item, stage: string | null): boolean {
  if (item.appliesTo === 'all') return true
  if (!stage) return false
  return item.appliesTo === stage
}

// 채점 메인 함수
export function calculate(
  instrument: Instrument,
  stage: string | null,           // '성장' | '진입' | '연속' | '신규' | null
  responses: Record<string, number | null>  // item_code → score(1~7) | null
): ScoringResult {
  // 배점 결정
  const weightKey = instrument.stageWeighted && stage ? stage : 'all'
  const weights = instrument.weights[weightKey]
    ?? instrument.weights['all']
    ?? instrument.weights[Object.keys(instrument.weights)[0]]
    ?? {}

  const areaAverages: Record<string, number> = {}
  const areaScores: Record<string, number> = {}
  const itemCount: Record<string, number> = {}

  // 영역별로 그룹핑
  const areaItems: Record<string, Item[]> = {}
  for (const item of instrument.items) {
    if (!itemApplies(item, stage)) continue
    if (!areaItems[item.area]) areaItems[item.area] = []
    areaItems[item.area].push(item)
  }

  for (const [areaCode, items] of Object.entries(areaItems)) {
    const normalized: number[] = []
    for (const item of items) {
      const raw = responses[item.code]
      if (raw !== null && raw !== undefined) {
        normalized.push(normalizeScore(raw))
      }
    }

    itemCount[areaCode] = normalized.length

    if (normalized.length === 0) {
      areaAverages[areaCode] = 0
      areaScores[areaCode] = 0
      continue
    }

    const avg = normalized.reduce((a, b) => a + b, 0) / normalized.length
    const weight = (weights as Record<string, number>)[areaCode] ?? 0
    areaAverages[areaCode] = avg
    areaScores[areaCode] = avg * (weight / 100)
  }

  const totalScore = Object.values(areaScores).reduce((a, b) => a + b, 0)
  // 등급 컷: A ≥ 85, B ≥ 75, 그 외 C (반올림 전 원값 기준)
  const grade = totalScore >= 85 ? 'A' : totalScore >= 75 ? 'B' : 'C'

  return { areaScores, areaAverages, totalScore, grade, itemCount }
}
