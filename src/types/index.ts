// ─── 설정 JSON 타입 ───────────────────────────────────────────

export type ItemType = 'likert7' | '구간' | '유무' | '정성' | '4점' | '유무서술' | '수치쌍'

export interface Item {
  code: string
  area: string
  no: number
  type: ItemType
  appliesTo: 'all' | '성장' | '진입' | '연속'
  text: string
  anchor: Record<string, string> | null
  naAllowed?: boolean
}

export interface AreaWeights {
  A: number; B: number; C: number; D: number; E: number; F: number; G: number
  [key: string]: number
}

export interface Instrument {
  id: string
  name: string
  target: string
  stageWeighted: boolean
  stageField: string | { name: string; values: string[]; scoring: string; note: string }
  stageValues?: string[]
  weights: Record<string, AreaWeights>
  items: Item[]
  effectivenessRule?: string
}

export interface SelfAssessmentItem {
  q: number
  text: string
  type: string
  options?: string[]
}

export interface SelfAssessmentForm {
  id: string
  name: string
  filledBy: string
  access?: string
  appliesToInstrument: string
  items: SelfAssessmentItem[]
}

export interface CrossCheckEntry {
  fact: string
  foundation: string[]
  operator: string[]
  evaluatorItem: string | string[]
  rule?: string
}

export interface InstrumentConfig {
  version: string
  scoring: {
    scaleMax: number
    itemNormalization: string
    areaScore: string
    areaContribution: string
    gradeRule: string
    gradeCuts: { grade: string; gt: number | null }[]
  }
  areas: Record<string, { name: string; stage: string; note?: string }>
  instruments: Instrument[]
  selfAssessmentForms?: {
    foundation: SelfAssessmentForm
    operator: SelfAssessmentForm
    crossCheckMap: CrossCheckEntry[]
  }
  targetModel: {
    field: string
    options: string[]
    guidanceAppliesTo: string[]
    guidanceItems: string[]
    guidanceText: string
    preSurvey: unknown
  }
}

// ─── DB 타입 ─────────────────────────────────────────────────

export type UserRole = 'admin' | 'evaluator'
export type InstrumentType = 'platform_foundation' | 'platform_org' | 'private_space_foundation'
export type OperationStage = '진입' | '성장'
export type TargetModel = '개방-일반형' | '특정-공동체형' | '혼합형'
export type FiscalYearType = '신규' | '연속'
export type EvaluationStatus = 'draft' | 'submitted'

export interface Profile {
  id: string
  role: UserRole
  name: string
  email: string
  created_at: string
}

export interface Subject {
  id: string
  name: string
  instrument: InstrumentType
  stage: OperationStage | null
  fiscal_year: FiscalYearType | null
  target_model: TargetModel | null
  activity_type: string | null
  history: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Assignment {
  id: string
  subject_id: string
  evaluator_id: string
  created_at: string
}

export interface Evaluation {
  id: string
  assignment_id: string
  status: EvaluationStatus
  submitted_at: string | null
  area_scores: Record<string, number> | null
  total_score: number | null
  grade: string | null
  created_at: string
  updated_at: string
}

export interface Response {
  id: string
  evaluation_id: string
  item_code: string
  score: number | null
  qualitative: string | null
  updated_at: string
}

export interface Reconciliation {
  id: string
  subject_id: string
  author_id: string
  area_scores: Record<string, number>
  total_score: number
  grade: string
  reason: string | null
  created_at: string
}

export interface OperatorToken {
  id: string
  subject_id: string
  token: string
  space_name: string
  expires_at: string | null
  used_at: string | null
  created_at: string
}

// ─── 채점 결과 타입 ───────────────────────────────────────────

export interface ScoringResult {
  areaScores: Record<string, number>   // 영역코드 → 영역 기여점수
  areaAverages: Record<string, number> // 영역코드 → 영역 평균(0~100)
  totalScore: number
  grade: 'A' | 'B' | 'C'
  itemCount: Record<string, number>    // 영역별 입력된 문항 수
}
