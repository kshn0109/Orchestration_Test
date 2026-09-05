---
title: 빌드 파이프라인 내부 들여다보기
date: 2026-03-10
tags: [architecture, build]
---

# 빌드 파이프라인 내부 들여다보기

`builder.ts` 는 이 프로젝트에서 유일하게 파일 시스템을 만지는 모듈입니다.
나머지 모듈은 전부 *문자열 in, 문자열 out* 순수 함수라서 테스트하기 쉽습니다.

## 단계별 책임

1. `collectMarkdownFiles(postsDir)` — `posts/` 안의 `.md` 파일을 모은다
2. `parseMarkdownFile(raw, slug)` — front matter와 본문을 분리하고 HTML로 변환한다
3. `sortPostsByDateDesc(posts)` — 날짜 내림차순으로 정렬한다
4. `renderPostPage(post)` / `renderIndexPage(posts)` — 템플릿을 적용한다
5. `fs.writeFileSync(...)` — `dist/` 에 기록한다

## 슬러그 규칙

출력 파일명은 소스 파일명에서 만들어집니다.

```ts
slugFromFilename("posts/Build Pipeline.md"); // => "build-pipeline"
```

즉 `posts/build-pipeline.md` 는 `dist/posts/build-pipeline.html` 이 됩니다.

## 디렉토리가 없다면

`posts/` 가 없으면 에러 대신 **빈 디렉토리를 만들고** 조용히 넘어갑니다.
`dist/` 와 `dist/posts/` 는 항상 `recursive: true` 로 생성됩니다.

> 빌드는 몇 번을 돌려도 같은 결과를 내야 합니다. 멱등성은 공짜가 아니지만 싸게 얻을 수 있습니다.

## 다음 단계

- Jest 테스트 추가
- CLI 옵션(`--in`, `--out`) 파싱
- 태그별 목록 페이지

관련 코드는 [빌드 결과 인덱스](../index.html)에서 확인할 수 있습니다.
