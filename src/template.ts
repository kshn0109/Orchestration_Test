/**
 * HTML 템플릿.
 *
 * 포스트 상세 페이지용 `renderPostPage`, 인덱스(목록) 페이지용 `renderIndexPage`를
 * 각각 export한다. 두 함수 모두 완전한 HTML 문서 문자열을 반환한다.
 */

import type { Post, SiteConfig } from "./types.js";

export const DEFAULT_SITE: SiteConfig = {
  title: "Markdown Blog",
  description: "마크다운으로 쓰는 정적 블로그",
};

const STYLES = `
  :root {
    --fg: #1f2328;
    --muted: #6b7280;
    --accent: #2563eb;
    --border: #e5e7eb;
    --code-bg: #f6f8fa;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 0 1.25rem 4rem;
    color: var(--fg);
    background: #ffffff;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans KR",
      Roboto, "Helvetica Neue", Arial, sans-serif;
    font-size: 17px;
    line-height: 1.75;
    -webkit-font-smoothing: antialiased;
  }
  .container { max-width: 720px; margin: 0 auto; }
  header.site {
    padding: 2.5rem 0 1.25rem;
    border-bottom: 1px solid var(--border);
    margin-bottom: 2.5rem;
  }
  header.site a.brand {
    font-size: 1.15rem;
    font-weight: 700;
    color: var(--fg);
    text-decoration: none;
    letter-spacing: -0.01em;
  }
  header.site p.tagline { margin: 0.35rem 0 0; color: var(--muted); font-size: 0.9rem; }
  h1, h2, h3, h4, h5, h6 { line-height: 1.3; letter-spacing: -0.01em; margin: 2rem 0 0.75rem; }
  h1 { font-size: 2rem; margin-top: 0; }
  h2 { font-size: 1.45rem; }
  h3 { font-size: 1.2rem; }
  p { margin: 0 0 1.1rem; }
  a { color: var(--accent); }
  ul, ol { padding-left: 1.35rem; margin: 0 0 1.1rem; }
  li { margin: 0.25rem 0; }
  hr { border: none; border-top: 1px solid var(--border); margin: 2.5rem 0; }
  blockquote {
    margin: 0 0 1.1rem;
    padding: 0.1rem 1rem;
    border-left: 3px solid var(--border);
    color: var(--muted);
  }
  img { max-width: 100%; height: auto; }
  code {
    background: var(--code-bg);
    padding: 0.15em 0.4em;
    border-radius: 4px;
    font-size: 0.87em;
    font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
  }
  pre {
    background: var(--code-bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 1rem;
    overflow-x: auto;
    line-height: 1.55;
    margin: 0 0 1.25rem;
  }
  pre code { background: none; padding: 0; font-size: 0.85em; }
  .meta { color: var(--muted); font-size: 0.88rem; margin: 0 0 2rem; }
  .tags { display: inline-flex; flex-wrap: wrap; gap: 0.35rem; margin-left: 0.5rem; }
  .tag {
    background: var(--code-bg);
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 0.05rem 0.55rem;
    font-size: 0.78rem;
    color: var(--muted);
  }
  ul.post-list { list-style: none; padding: 0; margin: 0; }
  ul.post-list li {
    padding: 1.1rem 0;
    border-bottom: 1px solid var(--border);
    margin: 0;
  }
  ul.post-list a { font-size: 1.1rem; font-weight: 600; text-decoration: none; }
  ul.post-list a:hover { text-decoration: underline; }
  .empty { color: var(--muted); }
  footer.site {
    margin-top: 3rem;
    padding-top: 1.25rem;
    border-top: 1px solid var(--border);
    color: var(--muted);
    font-size: 0.85rem;
  }
`;

function escapeAttr(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderTags(tags: string[]): string {
  if (tags.length === 0) return "";
  const items = tags
    .map((tag) => `<span class="tag">${escapeAttr(tag)}</span>`)
    .join("");
  return `<span class="tags">${items}</span>`;
}

interface LayoutOptions {
  pageTitle: string;
  site: SiteConfig;
  /** 사이트 헤더의 브랜드 링크 경로 (페이지 깊이에 따라 다름). */
  homeHref: string;
  body: string;
}

function layout({ pageTitle, site, homeHref, body }: LayoutOptions): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeAttr(pageTitle)}</title>
<meta name="description" content="${escapeAttr(site.description)}" />
<style>${STYLES}</style>
</head>
<body>
<div class="container">
<header class="site">
  <a class="brand" href="${escapeAttr(homeHref)}">${escapeAttr(site.title)}</a>
  <p class="tagline">${escapeAttr(site.description)}</p>
</header>
<main>
${body}
</main>
<footer class="site">
  <p>Built with the markdown static blog generator.</p>
</footer>
</div>
</body>
</html>
`;
}

/** 개별 포스트 페이지 HTML 문서를 생성한다. */
export function renderPostPage(post: Post, site: SiteConfig = DEFAULT_SITE): string {
  const meta = [post.date ? escapeAttr(post.date) : "", renderTags(post.tags)]
    .filter((part) => part.length > 0)
    .join(" ");

  const body = `<article>
  <h1>${escapeAttr(post.title)}</h1>
  ${meta ? `<p class="meta">${meta}</p>` : ""}
${post.html}
  <p><a href="../index.html">&larr; 목록으로</a></p>
</article>`;

  return layout({
    pageTitle: `${post.title} · ${site.title}`,
    site,
    homeHref: "../index.html",
    body,
  });
}

/** 전체 글 목록(인덱스) 페이지 HTML 문서를 생성한다. */
export function renderIndexPage(posts: Post[], site: SiteConfig = DEFAULT_SITE): string {
  const body =
    posts.length === 0
      ? `<p class="empty">아직 작성된 글이 없습니다.</p>`
      : `<ul class="post-list">
${posts
  .map(
    (post) => `  <li>
    <a href="posts/${escapeAttr(post.slug)}.html">${escapeAttr(post.title)}</a>
    <p class="meta" style="margin:0.25rem 0 0">${escapeAttr(post.date)} ${renderTags(post.tags)}</p>
  </li>`,
  )
  .join("\n")}
</ul>`;

  return layout({
    pageTitle: site.title,
    site,
    homeHref: "index.html",
    body,
  });
}
