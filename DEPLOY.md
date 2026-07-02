# Vercel 무료 배포 가이드

> 스택: Next.js 16 + Supabase / 호스팅: Vercel(무료) / DB·Auth: Supabase(무료)
> 프로덕션 빌드 확인 완료. 아래 순서대로 진행하면 됩니다.

---

## 1. 사전 준비

- [ ] GitHub 저장소에 최신 코드 push 완료 (현재 브랜치: `claude/dazzling-turing-yxiyj6`)
- [ ] Supabase 프로젝트의 아래 3개 값 확보
  - `NEXT_PUBLIC_SUPABASE_URL` — Supabase 대시보드 → Project Settings → Data API → Project URL
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — 같은 화면의 `anon` `public` 키
  - `SUPABASE_SERVICE_ROLE_KEY` — 같은 화면의 `service_role` 키 (⚠️ 비공개, 절대 코드/깃에 올리지 말 것)
- [ ] CHECKLIST.md §0의 SQL 4블록 실행 완료

---

## 2. Vercel 프로젝트 생성

1. https://vercel.com 에 GitHub 계정으로 로그인 (무료 Hobby 플랜)
2. **Add New… → Project**
3. 이 GitHub 저장소 **Import**
4. Framework Preset: **Next.js** 자동 감지됨 (그대로 둠)
5. Build/Output 설정: 기본값 그대로 (Build `next build`, 별도 수정 불필요)
6. 아직 **Deploy 누르지 말고** → 아래 3번 환경변수 먼저 입력

---

## 3. 환경변수 입력 (중요)

**Environment Variables** 섹션에 3개 추가 (Production·Preview·Development 모두 체크):

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | https://xxxx.supabase.co |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (anon public 키) |
| `SUPABASE_SERVICE_ROLE_KEY` | (service_role 키) |

- [ ] 3개 모두 입력 후 **Deploy** 클릭
- 첫 배포는 1~2분 소요

---

## 4. 배포 후 확인

- [ ] 배포된 주소 접속 (예: `https://프로젝트명.vercel.app`)
- [ ] `/login`에서 관리자 로그인 정상
- [ ] 관리자 대시보드·미리보기·대상 목록 정상 표시
- [ ] 위원 로그인 → 평가 폼 진입·저장 정상

---

## 5. Supabase Auth 리디렉트 설정

배포 주소를 Supabase가 허용하도록 등록.

1. Supabase 대시보드 → **Authentication → URL Configuration**
2. **Site URL**: `https://프로젝트명.vercel.app`
3. **Redirect URLs**에 `https://프로젝트명.vercel.app/**` 추가
4. 저장

---

## 6. 이후 운영

- **자동 배포**: 지정 브랜치에 push하면 Vercel이 자동 재배포
- **커스텀 도메인**(선택): Vercel 프로젝트 → Settings → Domains에서 연결(무료)
- **환경변수 변경 시**: Vercel에서 값 수정 후 **재배포** 필요

---

## 무료 티어 주의사항

- **Supabase 무료 프로젝트는 7일 미접속 시 일시정지** → 평가 안 하는 기간엔 멈출 수 있음. 대시보드에서 Restore 하면 즉시 복구.
- **Vercel Hobby는 상업적 사용 제한** → 공공/평가 목적은 일반적으로 무방하나, 대규모·수익 목적이면 약관 확인.
- **`SUPABASE_SERVICE_ROLE_KEY`는 절대 노출 금지** → Vercel 환경변수로만 관리 (코드·깃·클라이언트로 나가지 않음. `NEXT_PUBLIC_` 접두사 없음 = 서버 전용).
