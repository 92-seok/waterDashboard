# 저수지 수위 통합 모니터링 대시보드

실시간으로 저수지 관측소의 수위, 임계치, 통신 상태를 모니터링하는 대시보드입니다.

## 화면 구성

- 상단 통계 카드: 총 관측소 수 / 통신 정상 / 통신 오류 / 평균 저수율
- 관측소 카드: 현재 수위 · 임계치 · 저수율 표시 + 물결 애니메이션
- 자동 슬라이드: 8초 간격 페이지 전환, 20초 간격 데이터 갱신
- 반응형: 모바일(2열) / 태블릿(3열) / 1024px(4열) / 1440px+(5열)

## 저수율별 색상

| 상태 | 조건 | 색상 |
|------|------|------|
| 정상 | 100% 이하 | 파란색 (Cyan) |
| 경고 | 100% 초과 ~ 120% | 노란색 (Amber) |
| 위험 | 120% 초과 또는 통신 오류 | 빨간색 (Red) |

## 기술 스택

| 구분 | 기술 |
|------|------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 + Custom CSS |
| Database | Supabase (PostgreSQL) |
| Deployment | Vercel |

## 프로젝트 구조

```
web/
├── app/
│   ├── api/
│   │   └── devices/
│   │       └── route.ts      # Supabase 데이터 조회 API
│   ├── globals.css           # 전역 스타일 (CSS 변수 + 커스텀 클래스)
│   ├── layout.tsx            # 루트 레이아웃
│   └── page.tsx              # 메인 대시보드 페이지
├── lib/
│   └── supabase.ts           # Supabase 클라이언트 설정
├── .env.local                # 환경변수 (미포함)
└── next.config.ts
```

## Supabase 테이블 구조

```sql
CREATE TABLE reservoirs (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  water_level DECIMAL(6,2) NOT NULL DEFAULT 0,
  threshold   DECIMAL(6,2) NOT NULL DEFAULT 0,
  comm_status BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 로컬 실행

```bash
# 패키지 설치
npm install

# 환경변수 파일 생성
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_publishable_key

# 개발 서버 실행
npm run dev
```

## 배포

Vercel에 GitHub 레포 연결 후 환경변수 설정하면 자동 배포됩니다.

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

---

## 마이그레이션 기록 (Vue → Next.js)

기존 프로젝트는 Vue 3 + NestJS + 로컬 DB 구조였으며, 포트폴리오 배포를 위해 Next.js + Supabase로 전환했습니다.

### 변경 이유

- 기존 로컬 DB는 PC가 꺼지면 접근 불가 → Supabase 클라우드 DB로 이전
- 회사 DB 컬럼명 공개 불가 → 포트폴리오용 스키마 새로 설계
- NestJS 백엔드 → Next.js API Route로 통합 (단일 레포)
- Vercel 무료 배포를 위한 구조 변경

### 기술적 문제 및 해결

#### 1. Supabase RLS로 인해 API가 빈 배열 반환

- **문제**: `GET /api/devices` 호출 시 `[]` 반환
- **원인**: Supabase 기본 Row Level Security(RLS) 활성화 상태
- **해결**:
  ```sql
  ALTER TABLE reservoirs DISABLE ROW LEVEL SECURITY;
  ```

#### 2. Tailwind CSS v4에서 `@import`로 외부 CSS 파일 분리 불가

- **문제**: `globals.css`에서 `@import "./dashboard.css"` 사용 시 빌드 에러
  ```
  CssSyntaxError: Can't resolve './dashboard.css'
  ```
- **원인**: Tailwind v4는 `@import`를 자체적으로 처리하며 상대경로 CSS 분리 미지원
- **해결**: 별도 파일 분리 없이 `globals.css` 단일 파일에 모든 스타일 작성, `@layer base` / `@layer utilities` 활용

#### 3. Next.js App Router에서 커스텀 CSS 클래스 미적용

- **문제**: `globals.css`에 작성한 `.app`, `.card` 등 커스텀 클래스가 화면에 미적용
- **원인**: Tailwind v4의 CSS 레이어 처리 방식과 충돌
- **해결**: `@layer utilities { }` 블록 안에 커스텀 클래스 작성하여 해결

#### 4. git push 시 `src refspec main does not match any` 에러

- **문제**: `git push -u origin main` 실패
- **원인**: 커밋이 없는 상태에서 push 시도
- **해결**: `git add .` → `git commit` 후 push

#### 5. cp 명령어로 폴더 복사 시 중첩 구조 발생

- **문제**: `web/app/app/...` 으로 폴더가 이중 중첩됨
- **원인**: `cp -r app/ web/` 시 폴더 자체가 복사되어 `web/app/` 생성
- **해결**:
  ```bash
  mv app/* .
  git rm -r --cached .
  git add .
  ```
