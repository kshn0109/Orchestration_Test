# 마크다운 정적 블로그 생성기 (Markdown Static Blog Generator)

Node.js + TypeScript + Jest 기반의 마크다운 정적 블로그 생성기입니다.
`.md` 소스 파일을 읽어 정적 HTML 사이트로 변환합니다.

## 1. 아키텍처 개요

```
┌─────────────┐     ┌──────────────┐     ┌───────────────┐     ┌──────────────┐
│   CLI 진입점  │ --> │  콘텐츠 로더  │ --> │  마크다운 파서  │ --> │  템플릿 렌더러 │
│  (cli.ts)   │     │ (loader.ts)  │     │ (parser.ts)   │     │ (renderer.ts)│
└─────────────┘     └──────────────┘     └───────────────┘     └──────┬───────┘
                                                                       │
                                                                       v
                                                                ┌──────────────┐
                                                                │  파일 출력기   │
                                                                │ (writer.ts)  │
                                                                └──────────────┘
```

### 모듈 구성

| 모듈 | 경로 | 책임 |
|------|------|------|
| CLI 진입점 | `src/cli.ts` | 커맨드라인 인자 파싱, 빌드 파이프라인 실행 |
| 콘텐츠 로더 | `src/loader.ts` | `content/` 디렉토리 스캔, `.md` 파일 목록 및 raw 텍스트 수집 |
| Front matter 파서 | `src/frontmatter.ts` | 각 마크다운 파일 상단의 메타데이터(title, date, tags 등) 추출 |
| 마크다운 파서 | `src/parser.ts` | 마크다운 본문 → HTML 문자열 변환 |
| 포스트 모델 | `src/types.ts` | `Post`, `SiteConfig` 등 공용 타입 정의 |
| 템플릿 렌더러 | `src/renderer.ts` | 파싱된 포스트 데이터를 HTML 템플릿에 주입 |
| 파일 출력기 | `src/writer.ts` | 렌더링된 HTML을 `dist/` 디렉토리에 기록 |
| 인덱스 빌더 | `src/indexBuilder.ts` | 전체 포스트 목록으로 홈페이지(인덱스) 생성 |

## 2. 데이터 흐름

1. **입력**: `content/*.md` 파일들 (front matter + 마크다운 본문)
2. **로드 (loader.ts)**: 디렉토리를 스캔하여 파일 경로 목록 수집, 각 파일의 raw 텍스트 read
3. **메타데이터 분리 (frontmatter.ts)**: `---` 로 구분된 YAML 유사 헤더를 파싱하여 `{ metadata, content }` 형태로 분리
4. **HTML 변환 (parser.ts)**: 마크다운 본문을 HTML로 변환 (헤딩, 리스트, 코드블록, 링크 등 지원)
5. **포스트 객체 조립 (types.ts 기반)**: `{ slug, title, date, tags, html }` 형태의 `Post` 객체 생성
6. **렌더링 (renderer.ts)**: `Post` 객체를 HTML 템플릿(레이아웃)에 삽입하여 완성된 페이지 문자열 생성
7. **인덱스 생성 (indexBuilder.ts)**: 모든 `Post`를 날짜순 정렬하여 목록 페이지 생성
8. **출력 (writer.ts)**: 개별 포스트 HTML + 인덱스 HTML을 `dist/` 디렉토리에 파일로 기록
9. **결과**: `dist/index.html`, `dist/posts/{slug}.html` 등 정적 파일 완성

```
content/*.md
     │
     v
[loader] ──raw text──> [frontmatter parser] ──{meta, body}──> [markdown parser] ──html──┐
                                                                                          v
                                                                          [Post 객체: slug/title/date/html]
                                                                                          │
                                              ┌───────────────────────────────────────────┤
                                              v                                           v
                                     [renderer + template]                      [indexBuilder]
                                              │                                           │
                                              v                                           v
                                        dist/posts/*.html                          dist/index.html
```

## 3. 디렉토리 구조 (예정)

```
orchestration_test/
├── README.md
├── package.json
├── tsconfig.json
├── src/
│   ├── cli.ts
│   ├── loader.ts
│   ├── frontmatter.ts
│   ├── parser.ts
│   ├── renderer.ts
│   ├── indexBuilder.ts
│   ├── writer.ts
│   └── types.ts
├── content/          # 마크다운 소스 (사용자 작성)
│   └── example-post.md
├── templates/        # HTML 템플릿
│   ├── layout.html
│   └── index.html
├── dist/             # 빌드 결과물 (정적 사이트, git-ignore 대상)
└── __tests__/        # Jest 테스트
    ├── frontmatter.test.ts
    ├── parser.test.ts
    └── indexBuilder.test.ts
```

## 4. 기술 스택

- **런타임**: Node.js
- **언어**: TypeScript
- **테스트**: Jest + ts-jest
- **의존성 (예정)**: `typescript`, `@types/node`, `jest`, `ts-jest`, `@types/jest`

## 5. 향후 확장 고려사항

- 마크다운 파서는 초기에는 자체 구현(간단한 정규식 기반)으로 시작하고,
  필요 시 `marked`/`remark` 같은 외부 라이브러리로 교체 가능하도록 `parser.ts` 인터페이스를 분리한다.
- 템플릿 엔진은 문자열 치환 기반의 최소 구현으로 시작한다.
- CLI 옵션(빌드 대상 디렉토리, 출력 디렉토리 등)은 2단계 이후 구현 범위에서 추가한다.
