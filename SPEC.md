# 경기도 생활문화 사업 온라인평가시스템 명세서

> 작성일: 2026-06-27  
> 스택: Next.js 16 (App Router) + Supabase + TypeScript + Tailwind CSS

---

## 1. 시스템 개요

경기도 생활문화 사업 수행 기관·단체·공간을 대상으로 평가위원이 온라인으로 진단지를 작성하고, 관리자가 결과를 집계·내보내는 시스템.

---

## 2. 사용자 유형

| 역할 | 설명 | 인증 방식 |
|------|------|-----------|
| 관리자 (admin) | 시스템 전체 관리 | 매직링크 이메일 로그인 |
| 평가위원 (evaluator) | 배정된 대상 평가 | 매직링크 이메일 로그인 |
| 운영자 (operator) | 민간공간 자기진단 작성 | 토큰 URL (비밀번호 없음) |

---

## 3. 평가 대상 (subjects)

### 3-1. 필드
- 기관명 (name)
- 사업명 (title)
- 지역 (region)
- 진단유형 instrument: `platform_org` / `platform_foundation` / `private_space_foundation`
- 주체유형 (target_model): 일반형 / 특정-공동체형 / 혼합형
- 성장단계 (stage): 도입기 / 성장기 / 안정기
- 지원금액 (grant_amount)

### 3-2. 진단유형 매핑 (엑셀 업로드 기준)
| 진단유형 열 | 주체유형 열 | instrument |
|------------|------------|------------|
| 플랫폼 | 민간단체 | platform_org |
| 플랫폼 | 기초재단 | platform_foundation |
| 민간공간 | 기초재단 | private_space_foundation |

### 3-3. 엑셀 업로드
- 시트명: `종합표`
- 열 순서: B=기관명, C=사업명, D=지역, E=진단유형, F=주체유형, H=성장단계, J=지원금액
- 동일 (기관명, instrument) 조합이면 upsert

---

## 4. 진단지 3종

### 공통 구조
- 7점 척도 → 100점 환산
- 7개 영역 (A~G): 적합성, 주체성, 다양성, 개방성, 효과성, 확장성, 체계성
- 등급: A(85점 이상) / B(75점 이상) / C(75점 미만)
- 성장단계별 영역 가중치 상이

| 진단지 | 대상 | 항목 수 |
|--------|------|---------|
| platform_foundation | 플랫폼 사업 기초재단 | 27항목 |
| platform_org | 플랫폼 사업 민간단체 | 26항목 |
| private_space_foundation | 민간공간 기초재단 | 25항목 |

### 특수 안내
- `특정-공동체형` / `혼합형` 대상은 평가 시 별도 안내 배너 표시

---

## 5. 기능 명세

### 5-1. 관리자 기능

#### ✅ 구현완료
- [x] 관리자 로그인 (매직링크)
- [x] 대시보드 (평가대상 수 / 평가위원 수 / 진행 중 / 제출 완료)
- [x] 평가 대상 엑셀 일괄 업로드
- [x] 평가 대상 개별 등록
- [x] 평가위원 등록 (이름 + 이메일)
- [x] 평가위원-평가대상 배정
- [x] 진행상황 조회 (대상별 제출 여부)
- [x] 대상별 위원별 점수 비교표 조회
- [x] 결과 내보내기 (점수표 xlsx, 정성평가 docx)
- [x] 민간공간 운영자 토큰 발급 및 자기진단 조회

#### ❌ 미구현
- [ ] **평가위원 초대 메일 발송** — 등록 시 매직링크 자동 발송
- [ ] **관리자 직권 점수 수정** — 위원 간 합의된 변경 점수를 관리자가 직접 수정
- [ ] **진단지 3종 미리보기** — 관리자가 진단지 항목 전체를 화면에서 확인
- [ ] **진단지 세부항목 수정** — 관리자가 항목 텍스트·가중치 등을 UI에서 편집 (현재 `config/instruments.json` 정적 파일)

### 5-2. 평가위원 기능

#### ✅ 구현완료
- [x] 로그인 (매직링크)
- [x] 배정된 대상 목록 조회
- [x] 진단지 작성 (7점 척도, 영역별 정성 의견)
- [x] 자동저장 (1초 디바운스)
- [x] 실시간 점수 미리보기
- [x] 최종 제출 (제출 후 잠김)

#### ❌ 미구현
- 제출 후 수정 불가 (의도된 동작)

### 5-3. 운영자 기능 (민간공간)

#### ✅ 구현완료
- [x] 토큰 URL로 자기진단 접근 (비밀번호 없음)
- [x] 자기진단 작성 및 제출
- [x] 재단 자기진단과 교차 검토

---

## 6. 데이터베이스 주요 테이블

| 테이블 | 설명 |
|--------|------|
| profiles | 사용자 (admin/evaluator) |
| subjects | 평가 대상 |
| assignments | 위원-대상 배정 |
| evaluations | 평가 결과 (area_scores, total_score, status) |
| responses | 항목별 응답 (immutable after submit) |
| foundation_self_assessments | 재단 자기진단 |
| operator_self_assessments | 운영자 자기진단 |
| weight_change_logs | 가중치 변경 이력 |

---

## 7. 미구현 기능 우선순위 (권장)

1. **평가위원 초대 메일** — 위원 등록 즉시 사용 가능하게
2. **진단지 3종 미리보기** — 관리자가 내용 확인용
3. **관리자 직권 점수 수정** — 합의 결과 반영
4. **진단지 세부항목 수정** — 관리자 UI 편집 (복잡도 높음)

---

## 8. 환경변수 (.env.local)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Supabase 대시보드 → Project Settings → API 에서 복사.

---

## 9. 로컬 실행

```bash
git clone https://github.com/leemc-pd/gyeonggi-everyday-culture-initiative-online-assessment
cd gyeonggi-everyday-culture-initiative-online-assessment
git checkout claude/dazzling-turing-yxiyj6
npm install
# .env.local 파일 생성 후 환경변수 입력
npm run dev
# → http://localhost:3000
```
