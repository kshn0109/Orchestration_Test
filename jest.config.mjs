/**
 * Jest 설정 (ESM 모드).
 *
 * package.json 의 `"type": "module"` 때문에 테스트도 ESM으로 실행된다.
 * ts-jest 의 default-esm 프리셋을 쓰고, NodeNext 규칙에 따라 소스가 사용하는
 * `./foo.js` 형태의 상대경로 import 를 `./foo` 로 되돌려 해석한다.
 *
 * 실행: NODE_OPTIONS=--experimental-vm-modules npx jest  (npm test 참고)
 */

/** @type {import('jest').Config} */
export default {
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  extensionsToTreatAsEsm: [".ts"],
  moduleFileExtensions: ["ts", "tsx", "js", "mjs", "cjs", "json"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        useESM: true,
        tsconfig: "<rootDir>/tsconfig.test.json",
      },
    ],
  },
};
