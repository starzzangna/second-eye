# Second Eye

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
