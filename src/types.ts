/**
 * 공용 타입 정의.
 * README의 데이터 흐름(5단계 "포스트 객체 조립")에서 사용하는 모델들이다.
 */

/** 마크다운 파일 상단 front matter에서 추출한 메타데이터. */
export interface FrontMatter {
  /** 글 제목. front matter에 없으면 빈 문자열. */
  title: string;
  /** YYYY-MM-DD 형태의 발행일 문자열. 없으면 빈 문자열. */
  date: string;
  /** 태그 목록. 없으면 빈 배열. */
  tags: string[];
  /** title/date/tags 외의 임의 키(문자열로 보관). */
  extra: Record<string, string>;
}

/** front matter 블록과 본문을 분리한 결과. */
export interface SplitResult {
  /** front matter 블록 내부의 raw 텍스트 (구분자 `---` 제외). */
  frontMatter: string;
  /** front matter를 제거한 마크다운 본문. */
  body: string;
}

/** 렌더링 파이프라인이 다루는 최종 포스트 객체. */
export interface Post {
  /** 출력 파일명이 되는 슬러그 (보통 소스 파일명 기반). */
  slug: string;
  title: string;
  date: string;
  tags: string[];
  /** 마크다운 본문을 변환한 HTML 조각. */
  html: string;
}

/** 사이트 전역 설정(템플릿 렌더링용 최소 형태). */
export interface SiteConfig {
  title: string;
  description: string;
}
