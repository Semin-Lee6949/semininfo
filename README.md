# 청년나침반

온통청년의 청년정책·청년콘텐츠를 한 화면에서 탐색하는 웹사이트입니다.

## API 데이터 동기화

온통청년은 GitHub Pages 브라우저 요청을 HTTP 403으로 차단합니다. 서버리스 대신 GitHub Actions가 매일 API 데이터를 정적 JSON으로 갱신하고 홈페이지는 `data/`의 JSON을 읽습니다.

### GitHub Actions 등록 방법

1. 저장소 페이지에서 상단의 Settings(설정)를 클릭합니다.
2. 왼쪽 메뉴에서 보이지 않으면 화면을 아래로 조금 스크롤한 뒤, Secrets(비밀값), Actions(작업), 또는 Security(보안) 쪽 항목을 찾습니다.
3. 비밀값 관리 화면이 열리면 New repository secret 버튼을 눌러 새 비밀값을 추가합니다.
4. 아래 항목을 각각 등록합니다.
   - `YOUTH_POLICY_API_KEY`: 정책 API 인증키
   - `YOUTH_CONTENT_API_KEY`: 콘텐츠 API 인증키
5. 등록이 끝나면 상단의 Actions 탭으로 이동합니다.
6. `Sync youth data` 워크플로우를 열고 Run workflow 버튼을 눌러 한 번 수동 실행합니다.

정책 API `/go/ythip/getPlcy`와 콘텐츠 API `/go/ythip/getContent`는 `pageSize=100`, `rtnType=json`으로 요청합니다.

2026-07-08 검증 결과 정책 키는 정상 인증되어 총 2,633건을 반환했습니다. 다만 정책명 등 핵심 필드는 제공처 응답에서 모두 `null`이었고, 콘텐츠 API는 HTTP 500을 반환했습니다. 제공처 장애 중에는 화면이 미리보기 데이터를 유지합니다.
