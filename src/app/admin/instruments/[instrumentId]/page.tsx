import { notFound } from 'next/navigation'
import { getInstrumentWithOverrides } from '@/lib/instrumentOverrides'
import { getAreaName, AREA_CODES } from '@/lib/instruments'
import type { InstrumentType } from '@/types'
import InstrumentEditor from './InstrumentEditor'

const VALID: InstrumentType[] = ['platform_foundation', 'platform_org', 'private_space_foundation']
const LABELS: Record<InstrumentType, string> = {
  platform_foundation: '플랫폼 — 기초재단',
  platform_org: '플랫폼 — 유관기관·단체',
  private_space_foundation: '공간활성화 — 기초재단',
}

interface PageProps {
  params: Promise<{ instrumentId: string }>
}

export default async function InstrumentEditPage({ params }: PageProps) {
  const { instrumentId } = await params
  if (!VALID.includes(instrumentId as InstrumentType)) notFound()

  const instrument = await getInstrumentWithOverrides(instrumentId as InstrumentType)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">진단지 편집</h1>
          <p className="text-sm text-gray-500 mt-0.5">{LABELS[instrumentId as InstrumentType]}</p>
        </div>
      </div>
      <InstrumentEditor
        instrumentId={instrumentId as InstrumentType}
        initialItems={instrument.items}
        areaCodes={AREA_CODES.filter(a => instrument.items.some(i => i.area === a))}
        areaNames={Object.fromEntries(AREA_CODES.map(a => [a, getAreaName(a)]))}
      />
    </div>
  )
}
