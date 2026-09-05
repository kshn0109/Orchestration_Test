/**
 * 마크다운 파서.
 *
 * 두 가지 책임을 가진다.
 *  1. front matter(`---` 로 감싼 블록)와 본문 분리 및 메타데이터 파싱
 *  2. 마크다운 본문 -> HTML 변환 (외부 라이브러리 없이 자체 구현)
 *
 * 지원 문법: ATX 헤딩(#~######), 문단, 굵게(**), 기울임(* 또는 _),
 * 인라인 코드(`), 펜스 코드블록(```), 링크, 이미지, 순서 없는/있는 리스트,
 * 인용문(>), 수평선(---).
 */

import type { FrontMatter, Post, SplitResult } from "./types.js";

const FRONT_MATTER_RE = /^\uFEFF?---[ \t]*\r?\n([\s\S]*?)\r?\n?---[ \t]*(?:\r?\n|$)/;

/** HTML 특수문자 이스케이프. */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * raw 텍스트에서 front matter 블록과 본문을 분리한다.
 * front matter가 없으면 frontMatter는 빈 문자열이고 본문은 원본 그대로다.
 */
export function splitFrontMatter(raw: string): SplitResult {
  const normalized = raw.replace(/\r\n/g, "\n");
  const match = FRONT_MATTER_RE.exec(normalized);
  if (!match) {
    return { frontMatter: "", body: normalized.replace(/^\uFEFF/, "") };
  }
  const block = match[1] ?? "";
  return { frontMatter: block, body: normalized.slice(match[0].length) };
}

function stripQuotes(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length >= 2) {
    const first = trimmed[0];
    const last = trimmed[trimmed.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return trimmed.slice(1, -1);
    }
  }
  return trimmed;
}

/** `[a, b]` 또는 `a, b` 형태의 태그 목록을 배열로 변환. */
function parseTagList(value: string): string[] {
  let source = value.trim();
  if (source.startsWith("[") && source.endsWith("]")) {
    source = source.slice(1, -1);
  }
  return source
    .split(",")
    .map((item) => stripQuotes(item))
    .filter((item) => item.length > 0);
}

/**
 * front matter 블록 텍스트를 파싱한다.
 * `key: value` 한 줄 형식과, tags에 한해 `- item` 목록 형식을 지원한다.
 */
export function parseFrontMatter(block: string): FrontMatter {
  const meta: FrontMatter = { title: "", date: "", tags: [], extra: {} };
  if (block.trim().length === 0) return meta;

  const lines = block.split("\n");
  let currentListKey: string | null = null;

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/, "");
    if (line.trim().length === 0) continue;

    // `  - item` 형태: 직전 key의 목록 항목
    const listItem = /^\s*-\s+(.*)$/.exec(line);
    if (listItem && currentListKey) {
      const item = stripQuotes(listItem[1] ?? "");
      if (currentListKey === "tags" && item.length > 0) meta.tags.push(item);
      continue;
    }

    const pair = /^([A-Za-z0-9_-]+)\s*:\s*(.*)$/.exec(line);
    if (!pair) continue;

    const key = (pair[1] ?? "").toLowerCase();
    const value = pair[2] ?? "";

    if (value.trim().length === 0) {
      currentListKey = key;
      continue;
    }
    currentListKey = null;

    if (key === "title") meta.title = stripQuotes(value);
    else if (key === "date") meta.date = stripQuotes(value);
    else if (key === "tags") meta.tags = parseTagList(value);
    else meta.extra[key] = stripQuotes(value);
  }

  return meta;
}

const CODE_PLACEHOLDER_OPEN = "\u0000C";
const CODE_PLACEHOLDER_CLOSE = "\u0000";

/** 한 줄(또는 문단) 내부의 인라인 마크다운 문법을 HTML로 변환한다. */
export function renderInline(text: string): string {
  // 인라인 코드는 다른 규칙의 영향을 받으면 안 되므로 먼저 뽑아 둔다.
  const codes: string[] = [];
  let out = text.replace(/`([^`]+)`/g, (_match, code: string) => {
    codes.push(`<code>${escapeHtml(code)}</code>`);
    return `${CODE_PLACEHOLDER_OPEN}${codes.length - 1}${CODE_PLACEHOLDER_CLOSE}`;
  });

  out = escapeHtml(out);

  // 이미지 -> 링크 순서 (이미지가 링크 패턴의 부분집합이므로)
  out = out.replace(
    /!\[([^\]]*)\]\(([^)\s]+)\)/g,
    (_m, alt: string, src: string) => `<img src="${src}" alt="${alt}" />`,
  );
  out = out.replace(
    /\[([^\]]+)\]\(([^)\s]+)\)/g,
    (_m, label: string, href: string) => `<a href="${href}">${label}</a>`,
  );

  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  out = out.replace(/(^|[^\w_])_([^_\n]+)_(?![\w_])/g, "$1<em>$2</em>");

  out = out.replace(
    new RegExp(`${CODE_PLACEHOLDER_OPEN}(\\d+)${CODE_PLACEHOLDER_CLOSE}`, "g"),
    (_m, index: string) => codes[Number(index)] ?? "",
  );

  return out;
}

const FENCE_RE = /^\s*(?:```|~~~)\s*([A-Za-z0-9_+-]*)\s*$/;
const FENCE_END_RE = /^\s*(?:```|~~~)\s*$/;
const HEADING_RE = /^(#{1,6})\s+(.*)$/;
const HR_RE = /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/;
const UL_RE = /^\s*[-*+]\s+(.*)$/;
const OL_RE = /^\s*\d+[.)]\s+(.*)$/;
const QUOTE_RE = /^\s*>\s?(.*)$/;

function isBlockStart(line: string): boolean {
  return (
    FENCE_RE.test(line) ||
    HEADING_RE.test(line) ||
    HR_RE.test(line) ||
    UL_RE.test(line) ||
    OL_RE.test(line) ||
    QUOTE_RE.test(line) ||
    line.trim().length === 0
  );
}

/** 마크다운 본문을 HTML 문자열로 변환한다. */
export function markdownToHtml(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] ?? "";

    // 빈 줄
    if (line.trim().length === 0) {
      i += 1;
      continue;
    }

    // 코드블록
    const fence = FENCE_RE.exec(line);
    if (fence) {
      const lang = fence[1] ?? "";
      i += 1;
      const buffer: string[] = [];
      while (i < lines.length && !FENCE_END_RE.test(lines[i] ?? "")) {
        buffer.push(lines[i] ?? "");
        i += 1;
      }
      i += 1; // 닫는 펜스 소비
      const cls = lang ? ` class="language-${lang}"` : "";
      out.push(`<pre><code${cls}>${escapeHtml(buffer.join("\n"))}</code></pre>`);
      continue;
    }

    // 수평선 (리스트보다 먼저 검사)
    if (HR_RE.test(line)) {
      out.push("<hr />");
      i += 1;
      continue;
    }

    // 헤딩
    const heading = HEADING_RE.exec(line);
    if (heading) {
      const level = (heading[1] ?? "#").length;
      out.push(`<h${level}>${renderInline((heading[2] ?? "").trim())}</h${level}>`);
      i += 1;
      continue;
    }

    // 인용문
    if (QUOTE_RE.test(line)) {
      const buffer: string[] = [];
      while (i < lines.length && QUOTE_RE.test(lines[i] ?? "")) {
        const m = QUOTE_RE.exec(lines[i] ?? "");
        buffer.push(m?.[1] ?? "");
        i += 1;
      }
      out.push(`<blockquote>\n${markdownToHtml(buffer.join("\n"))}\n</blockquote>`);
      continue;
    }

    // 순서 없는 리스트
    if (UL_RE.test(line)) {
      const items: string[] = [];
      while (i < lines.length && UL_RE.test(lines[i] ?? "")) {
        const m = UL_RE.exec(lines[i] ?? "");
        items.push(`  <li>${renderInline((m?.[1] ?? "").trim())}</li>`);
        i += 1;
      }
      out.push(`<ul>\n${items.join("\n")}\n</ul>`);
      continue;
    }

    // 순서 있는 리스트
    if (OL_RE.test(line)) {
      const items: string[] = [];
      while (i < lines.length && OL_RE.test(lines[i] ?? "")) {
        const m = OL_RE.exec(lines[i] ?? "");
        items.push(`  <li>${renderInline((m?.[1] ?? "").trim())}</li>`);
        i += 1;
      }
      out.push(`<ol>\n${items.join("\n")}\n</ol>`);
      continue;
    }

    // 문단: 다음 블록 시작 전까지 이어 붙인다.
    const paragraph: string[] = [];
    while (i < lines.length && !isBlockStart(lines[i] ?? "")) {
      paragraph.push((lines[i] ?? "").trim());
      i += 1;
    }
    out.push(`<p>${renderInline(paragraph.join("\n"))}</p>`);
  }

  return out.join("\n");
}

/**
 * 마크다운 파일 raw 텍스트 하나를 Post 객체로 파싱한다.
 * slug는 파일명 기반이므로 builder에서 넘겨준다(기본값 빈 문자열).
 */
export function parseMarkdownFile(raw: string, slug = ""): Post {
  const { frontMatter, body } = splitFrontMatter(raw);
  const meta = parseFrontMatter(frontMatter);
  return {
    slug,
    title: meta.title || slug || "Untitled",
    date: meta.date,
    tags: meta.tags,
    html: markdownToHtml(body),
  };
}
