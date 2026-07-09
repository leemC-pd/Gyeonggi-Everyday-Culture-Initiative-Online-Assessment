import { createServiceClient as createClient } from '@/lib/supabase/service'
import ExportButtons from './ExportButtons'

export default async function ExportPage() {
  const supabase = createClient()

  const { count: submittedCount } = await supabase
    .from('evaluations')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'submitted')

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-800">내보내기</h1>
        <p className="text-sm text-gray-500 mt-1">
          제출 완료된 평가 <b>{submittedCount ?? 0}건</b>을 내보냅니다.
        </p>
      </div>

      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-800 mb-1">점수표 (.xlsx)</h2>
          <p className="text-sm text-gray-500 mb-3">
            대상별 영역 환산점수·총점·등급 + 산식·컷 표기. 시트2에 영역 평균 비교표(참고용) 포함.
          </p>
          <ExportButtons type="scores" label="점수표 xlsx 다운로드" />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-800 mb-1">정성 취합 (.docx)</h2>
          <p className="text-sm text-gray-500 mb-3">
            대상별 점수 요약 + 영역별 정성 코멘트 취합. 합의 기록 있으면 합의 점수 반영.
          </p>
          <ExportButtons type="qualitative" label="정성 취합 docx 다운로드" />
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-6">
        진단지 종류가 다른 대상 간 총점 직접 비교는 부적절합니다(문항 수·배점 상이). xlsx 시트2의 영역 평균으로 비교하세요.
      </p>
    </div>
  )
}
