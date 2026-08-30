# OpenAI API 월 사용 한도 설정 메모

확인일: 2026-08-30

## 결론

현재 OpenAI API에는 비용 알림용 **Spend alert/Budget**과 실제 요청을 제한하는 월별 **Hard spend limit**이 따로 있다. 공식 API 문서상 hard spend limit은 조직과 개별 프로젝트 모두에 설정할 수 있고, 단위는 USD 센트, 평가 주기는 월(`month`)이다. Second Eye에는 프로젝트 단위 hard spend limit을 우선 적용하고 앱 자체 호출 제한도 함께 둔다.

## 권장 초기 설정

- 프로젝트: Second Eye 전용 프로젝트와 프로젝트 API 키 사용
- 프로젝트 hard spend limit: 해커톤 개발 기간에는 `US$10`으로 시작
- Spend alert/Budget 알림: `US$5`, `US$8`, `US$10`
- 앱 자체 제한: IP 또는 세션별 하루 10회, 요청당 이미지 최대 6장, 이미지당 크기 제한
- 서버 타임아웃과 1회 재시도 유지
- 데모 당일에는 사전 계산 결과를 사용하는 명시적 데모 모드 준비

## 서로 다른 세 가지 제한

1. **Spend alert/Budget**: 설정한 금액에 도달했을 때 알림을 주는 비용 관찰 기준. 이것만으로 차단된다고 가정하지 않는다.
2. **Hard spend limit**: 조직 또는 프로젝트의 월간 비용 임계값. 공식 문서에서 `hard spend limit`으로 정의하며 enforcement 상태를 가진다.
3. **Rate limits**: 분당 요청 수(RPM), 분당 토큰 수(TPM), 일부 모델의 일일 요청 수 등을 제한. 과도한 동시 요청을 막지만 월 비용 총액 제한과는 다르다.
4. **결제 잔액·사용 티어**: 계정의 결제 상태에 따라 API 사용 가능 범위와 기본 rate limit이 달라진다.

## 운영 체크

- Usage Dashboard의 Costs 탭에서 프로젝트별 실제 청구 비용을 확인한다.
- 요청이 어느 프로젝트에 청구되는지 프로젝트 API 키로 분리한다.
- 공개 배포 전에는 서버에서 하루 사용량을 카운트하고 자체 상한을 넘으면 데모 모드 또는 친절한 제한 안내로 전환한다.
- API 키는 클라이언트 번들에 넣지 않고 서버 환경 변수로만 유지한다.
- 실제 한도 도달 시 진행 중 요청·비용 집계 지연 때문에 소액의 오차 가능성을 염두에 두고, 원하는 최대 지출보다 약간 낮게 설정한다.

## Second Eye에 권장하는 값

- 개발·내부 시험: 프로젝트 hard spend limit `US$10`
- 해커톤 당일 공개 시연: 트래픽이 제한적이면 `US$20`까지 임시 상향하고 다음 날 다시 `US$10`으로 복원
- 개인 카드 보호가 최우선이면 조직 hard spend limit도 감당 가능한 전체 금액으로 별도 설정
- 현재 앱의 `gpt-5.4-mini` 가격은 100만 토큰당 입력 `US$0.75`, 출력 `US$4.50`이며 이미지는 입력 토큰으로 계산된다. 실제 건당 비용은 이미지 해상도와 출력 길이에 따라 달라지므로 첫 10~20회 분석 후 Costs 탭에서 평균을 산출한다.

## 공식 문서

- [Usage와 Costs API](https://platform.openai.com/docs/api-reference/usage/audio_transcriptions_object)
- [프로젝트 hard spend limit 조회](https://developers.openai.com/api/reference/python/resources/admin/subresources/organization/subresources/projects/subresources/spend_limit/methods/retrieve)
- [프로젝트 hard spend limit 수정](https://developers.openai.com/api/reference/python/resources/admin/subresources/organization/subresources/projects/subresources/spend_limit/methods/update)
- [조직 hard spend limit 조회](https://developers.openai.com/api/reference/python/resources/admin/subresources/organization/subresources/spend_limit/methods/retrieve)
- [프로젝트 spend alert 생성](https://developers.openai.com/api/reference/python/resources/admin/subresources/organization/subresources/projects/subresources/spend_alerts/methods/create)
- [프로젝트 API 키](https://platform.openai.com/docs/api-reference/project-api-keys/retrieve)
- [프로젝트별 rate limit 수정](https://developers.openai.com/api/reference/python/resources/admin/subresources/organization/subresources/projects/subresources/rate_limits/methods/update_rate_limit)
- [GPT-5.4 mini 모델 및 사용 티어별 rate limit](https://developers.openai.com/api/docs/models/gpt-5.4-mini)
- [API 키 보안과 프로젝트 지정](https://platform.openai.com/docs/api-reference/introduction)
