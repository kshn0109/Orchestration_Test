import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";

import {
  build,
  collectMarkdownFiles,
  findProjectRoot,
  slugFromFilename,
  sortPostsByDateDesc,
} from "../src/builder.js";
import type { Post } from "../src/types.js";

let tmpRoot: string;

beforeEach(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "blog-builder-test-"));
});

afterEach(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});

function post(overrides: Partial<Post> & { slug: string }): Post {
  return { title: overrides.slug, date: "", tags: [], html: "", ...overrides };
}

describe("slugFromFilename", () => {
  it("확장자를 떼고 소문자 하이픈 슬러그를 만든다", () => {
    expect(slugFromFilename("Hello World.md")).toBe("hello-world");
    expect(slugFromFilename("/a/b/My_Post_Name.md")).toBe("my-post-name");
  });

  it("허용되지 않는 문자를 제거하고 하이픈을 정리한다", () => {
    expect(slugFromFilename("Hello, World!.md")).toBe("hello-world");
    expect(slugFromFilename("--trim--.md")).toBe("trim");
    expect(slugFromFilename("한글 제목.md")).toBe("한글-제목");
  });
});

describe("collectMarkdownFiles", () => {
  it("디렉토리가 없으면 만들고 빈 배열을 반환한다", () => {
    const missing = path.join(tmpRoot, "nope");
    expect(collectMarkdownFiles(missing)).toEqual([]);
    expect(fs.existsSync(missing)).toBe(true);
  });

  it(".md/.mdx 파일만 정렬된 절대경로로 모은다", () => {
    const dir = path.join(tmpRoot, "posts");
    fs.mkdirSync(dir);
    fs.writeFileSync(path.join(dir, "b.md"), "b");
    fs.writeFileSync(path.join(dir, "a.md"), "a");
    fs.writeFileSync(path.join(dir, "c.mdx"), "c");
    fs.writeFileSync(path.join(dir, "notes.txt"), "skip");
    fs.mkdirSync(path.join(dir, "nested.md"));

    expect(collectMarkdownFiles(dir)).toEqual([
      path.join(dir, "a.md"),
      path.join(dir, "b.md"),
      path.join(dir, "c.mdx"),
    ]);
  });
});

describe("sortPostsByDateDesc", () => {
  it("날짜 내림차순, 같으면 제목 오름차순으로 정렬한다", () => {
    const input: Post[] = [
      post({ slug: "old", title: "Old", date: "2023-01-01" }),
      post({ slug: "b", title: "Beta", date: "2024-05-01" }),
      post({ slug: "a", title: "Alpha", date: "2024-05-01" }),
      post({ slug: "new", title: "New", date: "2025-02-02" }),
    ];

    expect(sortPostsByDateDesc(input).map((p) => p.slug)).toEqual(["new", "a", "b", "old"]);
  });

  it("원본 배열을 변경하지 않는다", () => {
    const input: Post[] = [
      post({ slug: "a", date: "2023-01-01" }),
      post({ slug: "b", date: "2024-01-01" }),
    ];
    const snapshot = input.map((p) => p.slug);

    sortPostsByDateDesc(input);

    expect(input.map((p) => p.slug)).toEqual(snapshot);
  });
});

describe("findProjectRoot", () => {
  it("src/ 의 부모 디렉토리를 가리킨다", () => {
    const root = findProjectRoot();
    expect(fs.existsSync(path.join(root, "package.json"))).toBe(true);
  });
});

describe("build", () => {
  function writePost(dir: string, name: string, contents: string): void {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, name), contents, "utf-8");
  }

  it("postsDir 를 읽어 outDir 아래 포스트/인덱스 HTML을 생성한다", () => {
    const postsDir = path.join(tmpRoot, "posts");
    const outDir = path.join(tmpRoot, "dist");

    writePost(
      postsDir,
      "First Post.md",
      ["---", "title: 첫 글", "date: 2024-01-01", "tags: [a]", "---", "", "# 안녕", ""].join("\n"),
    );
    writePost(
      postsDir,
      "second.md",
      ["---", "title: 둘째 글", "date: 2025-01-01", "---", "", "본문", ""].join("\n"),
    );

    const result = build({ postsDir, outDir });

    // 날짜 내림차순 정렬 결과
    expect(result.posts.map((p) => p.slug)).toEqual(["second", "first-post"]);
    expect(result.posts.map((p) => p.title)).toEqual(["둘째 글", "첫 글"]);

    const indexPath = path.join(outDir, "index.html");
    expect(result.writtenFiles).toEqual([
      path.join(outDir, "posts", "second.html"),
      path.join(outDir, "posts", "first-post.html"),
      indexPath,
    ]);
    for (const file of result.writtenFiles) {
      expect(fs.existsSync(file)).toBe(true);
    }

    const postHtml = fs.readFileSync(path.join(outDir, "posts", "first-post.html"), "utf-8");
    expect(postHtml).toContain("<h1>안녕</h1>");
    expect(postHtml.trimStart().startsWith("<!DOCTYPE html")).toBe(true);

    const indexHtml = fs.readFileSync(indexPath, "utf-8");
    expect(indexHtml).toContain("첫 글");
    expect(indexHtml).toContain("둘째 글");
  });

  it("site 옵션을 템플릿에 전달한다", () => {
    const postsDir = path.join(tmpRoot, "posts");
    const outDir = path.join(tmpRoot, "dist");
    writePost(postsDir, "x.md", "---\ntitle: X\ndate: 2024-01-01\n---\n\n내용\n");

    build({
      postsDir,
      outDir,
      site: { title: "커스텀 사이트", description: "설명입니다" },
    });

    const indexHtml = fs.readFileSync(path.join(outDir, "index.html"), "utf-8");
    expect(indexHtml).toContain("커스텀 사이트");
    expect(indexHtml).toContain("설명입니다");
  });

  it("포스트가 없어도 인덱스 페이지는 생성한다", () => {
    const postsDir = path.join(tmpRoot, "empty-posts");
    const outDir = path.join(tmpRoot, "dist");

    const result = build({ postsDir, outDir });

    expect(result.posts).toEqual([]);
    expect(result.writtenFiles).toEqual([path.join(outDir, "index.html")]);
    expect(fs.existsSync(path.join(outDir, "index.html"))).toBe(true);
    // 없던 postsDir 은 생성된다
    expect(fs.existsSync(postsDir)).toBe(true);
  });
});
