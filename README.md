# 오운완 대시보드 v3 — 파일 구조 안내

GitHub Pages(hyun6500.github.io/JH)에 **폴더 구조 그대로** 업로드하면 됩니다.

업로드 방법: 레포 → Add file → Upload files → 이 zip을 푼 내용물
(index.html, README.md, css 폴더, js 폴더)을 전부 드래그 → Commit changes.
기존 index.html 은 자동으로 덮어써지고, 접속 주소는 그대로
https://hyun6500.github.io/JH/ 입니다.

```
index.html          ← 마크업 셸 + 스크립트 로드 순서 (진입 파일)
css/
  style.css         ← 전체 스타일 (테마 토큰 → 컴포넌트 → 반응형 순서로 구성)
js/
  core.js           ← [1순위 로드] 상수·전역 상태 S·데이터 로딩/파싱·파생지표·탭 라우팅·지연 렌더링
  page-home.js      ← 홈 탭 (전광판, 인사이트 마퀴, 오늘 현황, 스트릭, 피드)
  page-rank.js      ← 랭킹·챌린지 탭 (시상대, 순위표, 챌린지, 종목 장인)
  page-data.js      ← 데이터·분석 탭 (차트 9종, 히트맵)
  page-vs.js        ← VS 비교 탭 (H2H, 승자 연출, 레이더/듀얼)
  page-me.js        ← 개인 기록 탭 (프로필, 배지, 달력, 페이스 넛지)
  widgets.js        ← 공용 위젯 (카운트업, 콘페티, ⌘K 팔레트, 레벨 가이드)
  storycard.js      ← 인스타 스토리 카드 이미지 생성
  inbody.js         ← 인바디 입력/차트/삭제 (Apps Script POST 연동)
  main.js           ← [마지막 로드] init() 호출 진입점
```

## 수정 시 규칙 3가지
1. **로드 순서 유지**: index.html 하단 script 태그 순서를 바꾸지 마세요.
   core.js 가 항상 처음, main.js 가 항상 마지막입니다.
2. **새 탭/기능 추가**: js/page-새이름.js 를 만들고 index.html 에서
   main.js "앞에" script 태그를 추가하면 됩니다.
   차트를 쓰면 core.js 의 PAGE_CHARTS 에 차트 키를 등록하세요.
3. **전역 함수 방식**: 모든 함수는 전역(window)입니다. ES 모듈(import/export)로
   바꾸면 HTML 인라인 onclick 이 전부 깨지니 이 구조를 유지하세요.

## 캐시 참고
GitHub Pages는 파일을 잠시 캐시합니다. 배포 후 예전 화면이 보이면
강력 새로고침(Ctrl+Shift+R)을 하거나, index.html 의 script 태그에
`js/core.js?v=2` 처럼 버전 쿼리를 붙여 갱신을 강제할 수 있습니다.
