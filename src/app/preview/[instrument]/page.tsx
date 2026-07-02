import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getInstrument, getAreaName, getConfig, AREA_CODES } from '@/lib/instruments'
import { itemApplies } from '@/lib/scoring'
import type { InstrumentType, Item } from '@/types'

const INSTRUMENT_LABELS: Record<string, string> = {
  platform_foundation: '플랫폼 — 기초재단',
  platform_org: '플랫폼 — 유관기관·단체',
  private_space_foundation: '공간활성화 — 기초재단',
}

const LIKERT_LABELS: Record<number, string> = {
  7: '매우 우수', 6: '우수', 5: '다소 우수', 4: '보통',
  3: '다소 미흡', 2: '미흡', 1: '매우 미흡',
}

const VALID_INSTRUMENTS = ['platform_foundation', 'platform_org', 'private_space_foundation']

interface PageProps {
  params: Promise<{ instrument: string }>
  searchParams: Promise<{ stage?: string }>
}

export default async function PreviewPage({ params, searchParams }: PageProps) {
  const { instrument: instrumentId } = await params
  const { stage } = await searchParams

  if (!VALID_INSTRUMENTS.includes(instrumentId)) notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const service = createServiceClient()
  const { data: profile } = await service
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  const backHref = profile?.role === 'admin' ? '/admin' : '/'

  const instrument = getInstrument(instrumentId as InstrumentType)
  const weightKey = instrument.stageWeighted && stage ? stage : 'all'
  const weights = (instrument.weights[weightKey] ?? instrument.weights[Object.keys(instrument.weights)[0]] ?? {}) as Record<string, number>

  const areaItems: Record<string, Item[]> = {}
  for (const item of instrument.items) {
    if (!areaItems[item.area]) areaItems[item.area] = []
    areaItems[item.area].push(item)
  }
  const activeAreas = AREA_CODES.filter(a => areaItems[a]?.length)

  const isStageWeighted = instrument.stageWeighted
  const stages = isStageWeighted ? ['진입', '성장'] : []

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center gap-3">
        <Link href={backHref} className="text-gray-400 hover:text-gray-600 text-sm">← 목록</Link>
        <div>
          <h1 className="font-bold text-gray-800">{INSTRUMENT_LABELS[instrumentId]}</h1>
          <p className="text-xs text-gray-500">진단지 미리보기 — 읽기 전용</p>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">

        {/* 성장단계 선택 탭 */}
        {isStageWeighted && (
          <div className="flex gap-2">
            {stages.map(s => (
              <Link
                key={s}
                href={`/preview/${instrumentId}?stage=${s}`}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
                  stage === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                }`}
              >
                {s}
              </Link>
            ))}
          </div>
        )}

        {/* 배점 안내 */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-xs text-amber-700">
          채점: (원점수−1)÷6×100 → 영역 평균 × 배점÷100 → 합산 (만점 100) / 등급컷: A ≥85점, B ≥75점, 그 외 C
          {Object.keys(weights).length > 0 && (
            <span className="ml-2">| 배점: {Object.entries(weights).map(([k, v]) => `${k}:${v}`).join(' ')}</span>
          )}
          {isStageWeighted && !stage && (
            <span className="ml-2 text-amber-500">← 성장단계를 선택하면 배점이 표시됩니다</span>
          )}
        </div>

        {/* 영역별 문항 */}
        {activeAreas.map(areaCode => {
          const items = areaItems[areaCode] ?? []
          const weight = weights[areaCode] ?? 0

          return (
            <section key={areaCode} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 border-b px-5 py-3 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-gray-700">{areaCode}. {getAreaName(areaCode)}</span>
                  <span className="ml-2 text-xs text-gray-500">배점 {weight}점</span>
                </div>
                <span className="text-xs text-gray-400">{items.length}문항</span>
              </div>

              {getConfig().areas[areaCode]?.note && (
                <div className="bg-amber-50 border-b border-amber-100 px-5 py-2 text-xs text-amber-700">
                  {getConfig().areas[areaCode]?.note}
                </div>
              )}

              <div className="divide-y divide-gray-100">
                {items.map(item => {
                  const applies = !stage || itemApplies(item, stage)

                  return (
                    <div key={item.code} className={`px-5 py-4 ${!applies ? 'opacity-40' : ''}`}>
                      <p className="text-sm text-gray-800 mb-3">
                        <span className="text-xs font-mono text-gray-400 mr-2">{item.code}</span>
                        {item.text}
                        {!applies && <span className="ml-2 text-xs text-gray-400">[해당없음 — 자동 제외]</span>}
                      </p>

                      {/* 7점 척도 표시 (비활성) */}
                      {applies && (
                        <div className="flex gap-1 flex-wrap">
                          {[7,6,5,4,3,2,1].map(v => (
                            <div key={v} className="flex flex-col items-center">
                              <span className="w-9 h-9 flex items-center justify-center rounded-full text-sm font-medium border bg-white text-gray-400 border-gray-200">
                                {['①','②','③','④','⑤','⑥','⑦'][v-1]}
                              </span>
                              <span className="text-[10px] text-gray-400 mt-0.5 w-12 text-center leading-tight">
                                {LIKERT_LABELS[v]}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* 앵커 */}
                      {item.anchor && applies && (
                        <details className="mt-2">
                          <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">채점 기준 보기</summary>
                          <ul className="mt-1 space-y-1 text-xs text-gray-600 pl-3">
                            {Object.entries(item.anchor).map(([k, v]) => (
                              <li key={k}>
                                <span className="font-medium">{['①','②','③','④','⑤','⑥','⑦'][Number(k)-1]}({k}점)</span> — {v}
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* 정성 영역 표시 */}
              <div className="px-5 py-4 bg-gray-50 border-t">
                <p className="text-xs font-medium text-gray-600 mb-1">{areaCode}영역 정성 평가</p>
                <div className="w-full border border-dashed border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-400 bg-white">
                  (평가위원이 이 영역에 대한 정성 의견을 입력합니다)
                </div>
              </div>
            </section>
          )
        })}
      </div>
    </main>
  )
}
