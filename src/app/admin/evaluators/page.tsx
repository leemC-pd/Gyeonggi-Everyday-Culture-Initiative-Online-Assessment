import { createServiceClient } from '@/lib/supabase/service'
import EvaluatorList from './EvaluatorList'

export default async function EvaluatorsPage() {
  const supabase = createServiceClient()

  const { data: evaluators } = await supabase
    .from('profiles')
    .select('id, name, email, created_at')
    .eq('role', 'evaluator')
    .order('name')

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800">평가위원 관리</h1>
      </div>
      <EvaluatorList evaluators={evaluators ?? []} />
    </div>
  )
}
