import config from '@/../config/instruments.json'
import type { InstrumentConfig, Instrument, InstrumentType } from '@/types'

const instrumentConfig = config as unknown as InstrumentConfig

export function getConfig(): InstrumentConfig {
  return instrumentConfig
}

export function getInstrument(id: InstrumentType): Instrument {
  const inst = instrumentConfig.instruments.find(i => i.id === id)
  if (!inst) throw new Error(`Instrument not found: ${id}`)
  return inst
}

export function getAreaName(code: string): string {
  return instrumentConfig.areas[code]?.name ?? code
}

export const AREA_CODES = ['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const
