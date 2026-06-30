import { createServiceClient } from '@/lib/supabase/service'
import { getInstrument } from '@/lib/instruments'
import type { Instrument, InstrumentType, Item } from '@/types'

export async function getInstrumentWithOverrides(id: InstrumentType): Promise<Instrument> {
  const base = getInstrument(id)
  try {
    const supabase = createServiceClient()
    const { data } = await supabase
      .from('instrument_overrides')
      .select('items')
      .eq('instrument_id', id)
      .single()
    if (data?.items) {
      return { ...base, items: data.items as Item[] }
    }
  } catch {
    // DB에 없으면 기본값 사용
  }
  return base
}

export async function saveInstrumentOverride(id: InstrumentType, items: Item[]): Promise<void> {
  const supabase = createServiceClient()
  await supabase.from('instrument_overrides').upsert({
    instrument_id: id,
    items,
    updated_at: new Date().toISOString(),
  })
}
