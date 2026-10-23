# Second Eye

**2026 원티드 해커톤을 위해 제작한 프로젝트입니다.**

**[GitHub Pages에서 데모 체험하기](https://starzzangna.github.io/second-eye/)**

중고 스마트폰 판매글의 주장과 상품 사진을 대조해 `확인됨`, `모순 가능성`, `사진으로 확인 불가`, `미고지 외관 특징`으로 정리하는 해커톤용 웹앱입니다. 결과는 거래 판단을 돕는 참고 정보이며 사기나 고장을 확정하지 않습니다.

## 실행

```bash
pnpm install
pnpm dev
```

`OPENAI_API_KEY`가 없으면 예제 버튼과 데모 분석이 동작합니다. 실제 사진 분석을 사용하려면 `.env.example`을 참고해 로컬 `.env`에 키를 설정하세요. 요청은 `store: false`로 전송되며 업로드 이미지는 앱에서 영구 저장하지 않습니다.

`SECOND_EYE_DAILY_LIMIT`은 배포 환경에서 사용자 IP별 실제 API 분석 횟수를 제한합니다. 기본값은 10회이며 데모 모드는 제한에 포함되지 않습니다. 이 제한은 서버 인스턴스 단위의 보조 장치이므로 OpenAI 프로젝트의 월별 Hard spend limit도 함께 설정해야 합니다.

## 확인 명령

```bash
pnpm lint
pnpm exec tsc --noEmit
pnpm build
pnpm eval:real
```

## MVP 범위

- 판매글 텍스트와 스마트폰 사진 1~6장 입력
- OpenAI Responses API의 이미지 입력 및 JSON Schema 구조화 출력
- 근거 이미지 번호, 정규화 좌표, 설명, 확신도 표시
- 판매자에게 보낼 추가 사진·영상 요청 질문 생성
- API 키나 네트워크가 없어도 시연 가능한 데모 모드

계정, 데이터베이스, 플랫폼 로그인·크롤링, 결제, IMEI·도난 조회는 포함하지 않습니다.

## GitHub Pages

[Second Eye 대표 사례 데모](https://starzzangna.github.io/second-eye/)에서 사진 근거, 주장별 대조 결과, 판매자 질문을 확인할 수 있습니다.

GitHub Pages는 정적 호스팅이므로 서버 API와 실제 AI 사진 분석을 실행하지 않습니다. Pages 화면은 미리 준비한 대표 사례만 제공하며 판매글 편집과 사진 업로드는 비활성화됩니다. 실제 분석은 위 실행 방법으로 서버를 띄우고 `OPENAI_API_KEY`를 설정해 이용하세요. 키를 Pages 빌드나 브라우저 코드에 넣지 마세요.

`main` 브랜치에 변경을 push하면 `.github/workflows/pages.yml`이 데모를 빌드하고 배포합니다. 저장소 Settings → Pages → Source는 **GitHub Actions**로 설정합니다.

```bash
pnpm build:pages
pnpm exec vite preview --config vite.pages.config.ts
```

기존 앱을 재사용하는 별도 Vite 진입점(`github-pages/`)으로 정적 데모만 빌드해 서버 API 배포와 분리합니다. 빌드 결과는 `dist-pages/`이며, 프로젝트 경로 `/second-eye/`를 기준으로 이미지와 정적 파일을 불러옵니다.
