/**
 * 빌드 파이프라인.
 *
 * posts/*.md -> parser -> Post[] -> template -> dist/posts/{slug}.html + dist/index.html
 *
 * 이 모듈을 직접 실행하면 빌드가 수행된다.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import { parseMarkdownFile } from "./parser.js";
import { DEFAULT_SITE, renderIndexPage, renderPostPage } from "./template.js";
import type { Post, SiteConfig } from "./types.js";

export interface BuildOptions {
  /** 마크다운 소스 디렉토리. 기본값: <프로젝트 루트>/posts */
  postsDir?: string;
  /** 출력 디렉토리. 기본값: <프로젝트 루트>/dist */
  outDir?: string;
  site?: SiteConfig;
}

export interface BuildResult {
  posts: Post[];
  writtenFiles: string[];
}

/** 이 파일 기준 프로젝트 루트(src/의 부모)를 추정한다. */
export function findProjectRoot(): string {
  return path.resolve(currentDir(), "..");
}

function currentDir(): string {
  // ESM/CJS 어느 쪽으로 컴파일되어도 동작하도록 방어적으로 처리한다.
  const meta = import.meta as ImportMeta & { url?: string };
  if (typeof meta.url === "string") {
    return path.dirname(fileURLToPath(meta.url));
  }
  return process.cwd();
}

/** 파일명에서 URL-safe 슬러그를 만든다. */
export function slugFromFilename(filename: string): string {
  return path
    .basename(filename, path.extname(filename))
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9가-힣.-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}

/** posts 디렉토리의 .md 파일 목록을 반환한다. 없으면 디렉토리를 만들고 빈 배열. */
export function collectMarkdownFiles(postsDir: string): string[] {
  if (!fs.existsSync(postsDir)) {
    fs.mkdirSync(postsDir, { recursive: true });
    return [];
  }
  return fs
    .readdirSync(postsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.mdx?$/i.test(entry.name))
    .map((entry) => path.join(postsDir, entry.name))
    .sort();
}

/** 날짜 내림차순(같으면 제목 오름차순) 정렬. */
export function sortPostsByDateDesc(posts: Post[]): Post[] {
  return [...posts].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return a.title.localeCompare(b.title);
  });
}

/** posts/ 를 읽어 dist/ 정적 사이트를 생성한다. */
export function build(options: BuildOptions = {}): BuildResult {
  const root = findProjectRoot();
  const postsDir = options.postsDir ?? path.join(root, "posts");
  const outDir = options.outDir ?? path.join(root, "dist");
  const site = options.site ?? DEFAULT_SITE;

  const outPostsDir = path.join(outDir, "posts");
  fs.mkdirSync(outPostsDir, { recursive: true });

  const files = collectMarkdownFiles(postsDir);
  const posts: Post[] = files.map((file) => {
    const raw = fs.readFileSync(file, "utf-8");
    return parseMarkdownFile(raw, slugFromFilename(file));
  });

  const sorted = sortPostsByDateDesc(posts);
  const writtenFiles: string[] = [];

  for (const post of sorted) {
    const target = path.join(outPostsDir, `${post.slug}.html`);
    fs.writeFileSync(target, renderPostPage(post, site), "utf-8");
    writtenFiles.push(target);
  }

  const indexPath = path.join(outDir, "index.html");
  fs.writeFileSync(indexPath, renderIndexPage(sorted, site), "utf-8");
  writtenFiles.push(indexPath);

  return { posts: sorted, writtenFiles };
}

/** 직접 실행 진입점. */
function main(): void {
  const result = build();
  console.log(`[build] ${result.posts.length}개의 포스트를 처리했습니다.`);
  for (const file of result.writtenFiles) {
    console.log(`  - ${file}`);
  }
}

/** 이 모듈이 `node builder.js` 처럼 직접 실행되었는지 판별한다. */
function isDirectRun(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  const meta = import.meta as ImportMeta & { url?: string };
  if (typeof meta.url !== "string") return false;
  const self = path.resolve(fileURLToPath(meta.url));
  const invoked = path.resolve(entry);
  // 확장자(.js/.ts)까지 붙여 실행하지 않은 경우도 고려한다.
  return (
    self === invoked ||
    self === `${invoked}.js` ||
    self === `${invoked}.ts` ||
    path.basename(self, path.extname(self)) === path.basename(invoked, path.extname(invoked)) &&
      path.dirname(self) === path.dirname(invoked)
  );
}

if (isDirectRun()) {
  main();
}
