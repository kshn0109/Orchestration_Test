import { describe, expect, it } from "@jest/globals";

import {
  escapeHtml,
  markdownToHtml,
  parseFrontMatter,
  parseMarkdownFile,
  renderInline,
  splitFrontMatter,
} from "../src/parser.js";

describe("escapeHtml", () => {
  it("HTML 특수문자를 엔티티로 바꾼다", () => {
    expect(escapeHtml(`<a href="x">A & B</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;A &amp; B&lt;/a&gt;",
    );
  });

  it("특수문자가 없으면 원문 그대로 반환한다", () => {
    expect(escapeHtml("plain text")).toBe("plain text");
  });
});

describe("splitFrontMatter", () => {
  it("front matter 블록과 본문을 분리한다", () => {
    const raw = ["---", "title: Hello", "date: 2024-01-01", "---", "", "# 본문", ""].join("\n");
    const result = splitFrontMatter(raw);

    expect(result.frontMatter).toBe("title: Hello\ndate: 2024-01-01");
    expect(result.body).toBe("\n# 본문\n");
  });

  it("front matter가 없으면 frontMatter는 빈 문자열이고 본문은 원본 그대로다", () => {
    const raw = "# 제목만 있는 글\n\n문단입니다.\n";
    const result = splitFrontMatter(raw);

    expect(result.frontMatter).toBe("");
    expect(result.body).toBe(raw);
  });

  it("CRLF 줄바꿈을 LF로 정규화한다", () => {
    const raw = "---\r\ntitle: CRLF\r\n---\r\n본문\r\n";
    const result = splitFrontMatter(raw);

    expect(result.frontMatter).toBe("title: CRLF");
    expect(result.body).toBe("본문\n");
  });

  it("본문 중간에 나오는 --- 는 front matter로 보지 않는다", () => {
    const raw = "인트로\n\n---\n\n아웃트로\n";
    const result = splitFrontMatter(raw);

    expect(result.frontMatter).toBe("");
    expect(result.body).toBe(raw);
  });
});

describe("parseFrontMatter", () => {
  it("title / date / tags 와 그 외 키(extra)를 파싱한다", () => {
    const block = [
      'title: "따옴표 제목"',
      "date: 2024-05-02",
      "tags: [typescript, jest]",
      "author: Suzuki",
    ].join("\n");

    const meta = parseFrontMatter(block);

    expect(meta.title).toBe("따옴표 제목");
    expect(meta.date).toBe("2024-05-02");
    expect(meta.tags).toEqual(["typescript", "jest"]);
    expect(meta.extra).toEqual({ author: "Suzuki" });
  });

  it("인라인 배열이 아닌 콤마 구분 tags 도 파싱한다", () => {
    const meta = parseFrontMatter("tags: a, b , 'c'");
    expect(meta.tags).toEqual(["a", "b", "c"]);
  });

  it("목록 형식(- item) tags 를 파싱한다", () => {
    const block = ["title: 목록 태그", "tags:", "  - alpha", "  - beta", "  - gamma"].join("\n");
    const meta = parseFrontMatter(block);

    expect(meta.title).toBe("목록 태그");
    expect(meta.tags).toEqual(["alpha", "beta", "gamma"]);
  });

  it("빈 블록이면 기본값을 돌려준다", () => {
    const meta = parseFrontMatter("   \n  ");
    expect(meta).toEqual({ title: "", date: "", tags: [], extra: {} });
  });

  it("키를 소문자로 정규화하고 파싱 불가한 줄은 무시한다", () => {
    const meta = parseFrontMatter(["TITLE: 대문자 키", "이건 그냥 텍스트", "Draft: true"].join("\n"));

    expect(meta.title).toBe("대문자 키");
    expect(meta.extra).toEqual({ draft: "true" });
  });
});

describe("renderInline", () => {
  it("굵게 / 기울임 / 링크 / 이미지를 변환한다", () => {
    expect(renderInline("**굵게** 와 *기울임*")).toBe(
      "<strong>굵게</strong> 와 <em>기울임</em>",
    );
    expect(renderInline("__굵게__ 와 _기울임_")).toBe(
      "<strong>굵게</strong> 와 <em>기울임</em>",
    );
    expect(renderInline("[링크](https://example.com)")).toBe(
      '<a href="https://example.com">링크</a>',
    );
    expect(renderInline("![대체](/img/a.png)")).toBe('<img src="/img/a.png" alt="대체" />');
  });

  it("인라인 코드 내부는 이스케이프하고 다른 문법을 적용하지 않는다", () => {
    expect(renderInline("`a < b && **x**`")).toBe("<code>a &lt; b &amp;&amp; **x**</code>");
  });

  it("코드 밖의 HTML 특수문자는 이스케이프한다", () => {
    expect(renderInline("5 < 6 & <b>")).toBe("5 &lt; 6 &amp; &lt;b&gt;");
  });
});

describe("markdownToHtml", () => {
  it("ATX 헤딩을 레벨에 맞는 태그로 변환한다", () => {
    expect(markdownToHtml("# 하나\n\n### 셋")).toBe("<h1>하나</h1>\n<h3>셋</h3>");
  });

  it("연속된 줄을 하나의 문단으로 묶는다", () => {
    expect(markdownToHtml("첫 줄\n둘째 줄\n\n다음 문단")).toBe(
      "<p>첫 줄\n둘째 줄</p>\n<p>다음 문단</p>",
    );
  });

  it("펜스 코드블록 내부를 이스케이프하고 언어 클래스를 붙인다", () => {
    const md = ["```ts", 'const x = "1 < 2 & 3";', "```"].join("\n");
    expect(markdownToHtml(md)).toBe(
      '<pre><code class="language-ts">const x = &quot;1 &lt; 2 &amp; 3&quot;;</code></pre>',
    );
  });

  it("언어 표기가 없는 코드블록은 클래스를 붙이지 않는다", () => {
    expect(markdownToHtml("```\nplain\n```")).toBe("<pre><code>plain</code></pre>");
  });

  it("순서 없는/있는 리스트를 변환한다", () => {
    expect(markdownToHtml("- 하나\n- 둘")).toBe("<ul>\n  <li>하나</li>\n  <li>둘</li>\n</ul>");
    expect(markdownToHtml("1. 하나\n2. 둘")).toBe("<ol>\n  <li>하나</li>\n  <li>둘</li>\n</ol>");
  });

  it("인용문 내부를 재귀적으로 변환한다", () => {
    expect(markdownToHtml("> 인용 **강조**")).toBe(
      "<blockquote>\n<p>인용 <strong>강조</strong></p>\n</blockquote>",
    );
  });

  it("수평선을 hr 로 변환한다", () => {
    expect(markdownToHtml("---")).toBe("<hr />");
    expect(markdownToHtml("***")).toBe("<hr />");
  });

  it("빈 입력은 빈 문자열을 만든다", () => {
    expect(markdownToHtml("")).toBe("");
    expect(markdownToHtml("\n\n   \n")).toBe("");
  });
});

describe("parseMarkdownFile", () => {
  it("front matter 와 본문을 합쳐 Post 객체를 만든다", () => {
    const raw = [
      "---",
      "title: 첫 글",
      "date: 2024-03-01",
      "tags: [blog, md]",
      "---",
      "",
      "# 안녕",
      "",
      "본문 **강조**",
      "",
    ].join("\n");

    const post = parseMarkdownFile(raw, "first-post");

    expect(post).toEqual({
      slug: "first-post",
      title: "첫 글",
      date: "2024-03-01",
      tags: ["blog", "md"],
      html: "<h1>안녕</h1>\n<p>본문 <strong>강조</strong></p>",
    });
  });

  it("title 이 없으면 slug 를, slug 도 없으면 Untitled 를 제목으로 쓴다", () => {
    const withSlug = parseMarkdownFile("본문만 있음", "only-body");
    expect(withSlug.title).toBe("only-body");
    expect(withSlug.date).toBe("");
    expect(withSlug.tags).toEqual([]);
    expect(withSlug.html).toBe("<p>본문만 있음</p>");

    const withoutSlug = parseMarkdownFile("본문만 있음");
    expect(withoutSlug.slug).toBe("");
    expect(withoutSlug.title).toBe("Untitled");
  });
});
