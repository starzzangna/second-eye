import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';

const projectRoot = resolve(import.meta.dirname, '..');
const baseUrl = process.env.SECOND_EYE_BASE_URL || 'http://localhost:3000';
const manifestPath = resolve(projectRoot, 'tests/real-cases.json');
const outputDir = resolve(projectRoot, 'tests/results');
const forbiddenTerms = ['사기', '고장 확정', '사진 조작 확정'];
const cases = JSON.parse(await readFile(manifestPath, 'utf8'));

async function analyzeCase(testCase) {
  const form = new FormData();
  form.set('listingText', testCase.listingText);
  form.set('demoMode', 'false');

  for (const relativePath of testCase.images) {
    const absolutePath = resolve(projectRoot, relativePath);
    const bytes = await readFile(absolutePath);
    form.append('images', new Blob([bytes], { type: 'image/webp' }), basename(relativePath));
  }

  const startedAt = Date.now();
  const response = await fetch(`${baseUrl}/api/analyze`, { method: 'POST', body: form });
  const data = await response.json();
  const elapsedMs = Date.now() - startedAt;

  if (!response.ok) {
    return { id: testCase.id, title: testCase.title, ok: false, elapsedMs, error: data.error || `HTTP ${response.status}` };
  }

  const verdicts = new Set((data.claims || []).map((claim) => claim.verdict));
  const verdictChecks = testCase.expectedVerdicts.map((verdict) => ({ verdict, passed: verdicts.has(verdict) }));
  const serialized = JSON.stringify(data);
  const forbidden = forbiddenTerms.filter((term) => serialized.includes(term));
  const schemaPassed = Array.isArray(data.claims)
    && Array.isArray(data.visualFindings)
    && Array.isArray(data.sellerQuestions)
    && typeof data.summary?.headline === 'string'
    && typeof data.summary?.counts === 'object';
  const passedChecks = verdictChecks.filter((check) => check.passed).length;
  const score = verdictChecks.length === 0 ? 1 : passedChecks / verdictChecks.length;

  return {
    id: testCase.id,
    title: testCase.title,
    ok: schemaPassed && forbidden.length === 0,
    elapsedMs,
    mode: data.mode,
    schemaPassed,
    verdictChecks,
    forbidden,
    score,
    summary: data.summary,
    claims: data.claims,
    visualFindings: data.visualFindings,
    sellerQuestions: data.sellerQuestions,
  };
}

const results = [];
for (const testCase of cases) {
  process.stdout.write(`[${testCase.id}/12] ${testCase.title} ... `);
  try {
    const result = await analyzeCase(testCase);
    results.push(result);
    console.log(result.ok ? `완료 (${result.elapsedMs}ms)` : `실패 (${result.error || '검증 오류'})`);
  } catch (error) {
    results.push({ id: testCase.id, title: testCase.title, ok: false, error: error instanceof Error ? error.message : String(error) });
    console.log('실패');
  }
}

const successful = results.filter((result) => result.ok);
const verdictChecks = results.flatMap((result) => result.verdictChecks || []);
const passedVerdictChecks = verdictChecks.filter((check) => check.passed).length;
const report = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  totals: {
    cases: results.length,
    schemaAndSafetyPassed: successful.length,
    expectedVerdicts: verdictChecks.length,
    expectedVerdictsPassed: passedVerdictChecks,
    expectedVerdictRate: verdictChecks.length ? passedVerdictChecks / verdictChecks.length : 0,
  },
  results,
};

const markdown = [
  '# Second Eye 실제 사례 자동 평가 결과',
  '',
  `- 실행 시각: ${report.generatedAt}`,
  `- 대상: ${baseUrl}`,
  `- 스키마·안전 통과: ${successful.length}/${results.length}`,
  `- 기대 판정 충족률: ${passedVerdictChecks}/${verdictChecks.length} (${Math.round(report.totals.expectedVerdictRate * 100)}%)`,
  '',
  '| ID | 사례 | 상태 | 기대 판정 | 시간 |',
  '| --- | --- | --- | --- | ---: |',
  ...results.map((result) => {
    const checks = (result.verdictChecks || []).map((check) => `${check.passed ? '✓' : '✗'} ${check.verdict}`).join(', ') || '실행 실패';
    return `| ${result.id} | ${result.title} | ${result.ok ? '통과' : '확인 필요'} | ${checks} | ${result.elapsedMs || 0}ms |`;
  }),
  '',
  '상세 응답은 같은 폴더의 `REAL_CASE_EVAL.json`에서 확인한다.',
  '',
].join('\n');

await mkdir(outputDir, { recursive: true });
await writeFile(resolve(outputDir, 'REAL_CASE_EVAL.json'), JSON.stringify(report, null, 2));
await writeFile(resolve(outputDir, 'REAL_CASE_EVAL.md'), markdown);
console.log(`\n보고서 저장: ${resolve(outputDir, 'REAL_CASE_EVAL.md')}`);
