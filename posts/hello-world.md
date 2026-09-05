---
title: Hello, Static Blog
date: 2026-01-15
tags: [intro, meta]
---

# Hello, Static Blog

이 글은 **마크다운 정적 블로그 생성기**의 첫 번째 샘플 포스트입니다.
`posts/` 폴더의 `.md` 파일이 어떻게 HTML로 바뀌는지 확인해 보세요.

## 왜 만들었나

정적 사이트 생성기는 결국 *텍스트 변환기*입니다.
입력은 마크다운, 출력은 HTML. 그 사이에 몇 개의 작은 단계가 있을 뿐입니다.

- 파일을 읽는다
- front matter를 떼어낸다
- 본문을 HTML로 바꾼다
- 템플릿에 끼워 넣는다
- 파일로 쓴다

## 파이프라인 한 줄 요약

```ts
const post = parseMarkdownFile(raw, slug);
const html = renderPostPage(post);
```

> 작게 시작하고, 필요할 때 키우면 됩니다.

자세한 설계는 [README](../index.html)에 정리되어 있습니다.
