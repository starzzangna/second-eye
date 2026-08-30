# Second Eye 실제 사례 자동 평가 결과

- 실행 시각: 2026-08-30T12:11:27.160Z
- 대상: http://localhost:3000
- 스키마·안전 통과: 12/12
- 기대 판정 충족률: 16/17 (94%)

| ID | 사례 | 상태 | 기대 판정 | 시간 |
| --- | --- | --- | --- | ---: |
| 01 | iPhone 13 Pro — 파손 고지와 기능 주장 | 통과 | ✗ confirmed, ✓ not_verifiable | 6275ms |
| 02 | iPhone 4S — A급·정품·구성품 주장 | 통과 | ✓ not_verifiable | 3736ms |
| 03 | iPhone 12 Pro — 후면 유리 파손·배터리·무수리 | 통과 | ✓ confirmed, ✓ not_verifiable | 4369ms |
| 04 | iPhone SE 1세대 — 새것 같은 외관·사설 배터리 | 통과 | ✓ not_verifiable | 4827ms |
| 05 | iPhone 6S Plus — 흰 점 고지·기능 정상 | 통과 | ✓ not_verifiable | 5445ms |
| 06 | iPhone 13 — 깨끗한 화면·일상 사용감 | 통과 | ✓ not_verifiable | 5100ms |
| 07 | iPhone 13 mini — SS급·최상품과 생활 흠집 | 통과 | ✓ not_verifiable | 4474ms |
| 08 | iPhone 8 — A급·무잔상·배터리 교체 | 통과 | ✓ not_verifiable | 4392ms |
| 09 | Galaxy S23+ — 중앙 빛샘 고지 | 통과 | ✓ confirmed, ✓ not_verifiable | 3841ms |
| 10 | Galaxy S26 — A급·미사용 풀박스 | 통과 | ✓ not_verifiable | 8020ms |
| 11 | Galaxy S22 Ultra — 기종 불일치 대표 사례 | 통과 | ✓ possible_conflict, ✓ not_verifiable | 9863ms |
| 12 | Galaxy S20 5G — 액정 파손·간헐 터치 | 통과 | ✓ confirmed, ✓ not_verifiable | 3714ms |

상세 응답은 같은 폴더의 `REAL_CASE_EVAL.json`에서 확인한다.
