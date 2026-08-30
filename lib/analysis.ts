import { z } from 'zod';

export const VERDICTS = [
  'confirmed',
  'possible_conflict',
  'not_verifiable',
  'unmentioned_visual_issue',
] as const;

export type Verdict = (typeof VERDICTS)[number];

export type EvidenceBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ClaimResult = {
  id: string;
  statement: string;
  verdict: Verdict;
  imageIndex: number | null;
  evidence: string;
  box: EvidenceBox | null;
  confidence: number;
};

export type VisualFinding = {
  id: string;
  title: string;
  detail: string;
  imageIndex: number;
  box: EvidenceBox | null;
  confidence: number;
};

export type AnalysisResult = {
  claims: ClaimResult[];
  visualFindings: VisualFinding[];
  summary: {
    headline: string;
    caution: string;
    counts: Record<Verdict, number>;
  };
  sellerQuestions: string[];
};

const boxSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  width: z.number().min(0).max(1),
  height: z.number().min(0).max(1),
}).nullable();

export const analysisResultSchema: z.ZodType<AnalysisResult> = z.object({
  claims: z.array(z.object({
    id: z.string(),
    statement: z.string(),
    verdict: z.enum(VERDICTS),
    imageIndex: z.number().int().nullable(),
    evidence: z.string(),
    box: boxSchema,
    confidence: z.number().min(0).max(1),
  })),
  visualFindings: z.array(z.object({
    id: z.string(),
    title: z.string(),
    detail: z.string(),
    imageIndex: z.number().int(),
    box: boxSchema,
    confidence: z.number().min(0).max(1),
  })),
  summary: z.object({
    headline: z.string(),
    caution: z.string(),
    counts: z.object({
      confirmed: z.number().int().min(0),
      possible_conflict: z.number().int().min(0),
      not_verifiable: z.number().int().min(0),
      unmentioned_visual_issue: z.number().int().min(0),
    }),
  }),
  sellerQuestions: z.array(z.string()).min(1).max(5),
});

const forbiddenLanguage = [
  ['사진 조작 확정', '사진과 다른 정황'],
  ['고장 확정', '작동 이상 가능성'],
  ['사기', '거래 위험'],
] as const;

function safeText(value: string) {
  return forbiddenLanguage.reduce((text, [unsafe, replacement]) => text.replaceAll(unsafe, replacement), value.trim());
}

function safeBox(box: EvidenceBox | null, imageIndex: number | null, imageCount: number) {
  if (!box || !imageIndex || imageIndex < 1 || imageIndex > imageCount) return null;
  const x = Math.min(1, Math.max(0, box.x));
  const y = Math.min(1, Math.max(0, box.y));
  return {
    x,
    y,
    width: Math.min(1 - x, Math.max(0, box.width)),
    height: Math.min(1 - y, Math.max(0, box.height)),
  };
}

export function normalizeAnalysisResult(input: AnalysisResult, imageCount: number): AnalysisResult {
  const claims = input.claims.map((claim, index) => {
    const verifiableImage = claim.imageIndex && claim.imageIndex >= 1 && claim.imageIndex <= imageCount ? claim.imageIndex : null;
    const imageIndex = claim.verdict === 'not_verifiable' ? null : verifiableImage;
    return {
      ...claim,
      id: claim.id || `claim-${index + 1}`,
      statement: safeText(claim.statement),
      evidence: safeText(claim.evidence),
      imageIndex,
      box: safeBox(claim.box, imageIndex, imageCount),
      confidence: Math.min(1, Math.max(0, claim.confidence)),
    };
  });
  const visualFindings = input.visualFindings
    .filter((finding) => finding.imageIndex >= 1 && finding.imageIndex <= imageCount)
    .map((finding, index) => ({
      ...finding,
      id: finding.id || `finding-${index + 1}`,
      title: safeText(finding.title),
      detail: safeText(finding.detail),
      box: safeBox(finding.box, finding.imageIndex, imageCount),
      confidence: Math.min(1, Math.max(0, finding.confidence)),
    }));
  const counts: Record<Verdict, number> = {
    confirmed: 0,
    possible_conflict: 0,
    not_verifiable: 0,
    unmentioned_visual_issue: visualFindings.length,
  };
  for (const claim of claims) counts[claim.verdict] += 1;

  return {
    claims,
    visualFindings,
    summary: {
      headline: safeText(input.summary.headline),
      caution: safeText(input.summary.caution),
      counts,
    },
    sellerQuestions: [...new Set(input.sellerQuestions.map(safeText))].slice(0, 5),
  };
}

export const demoListing = `갤럭시 S22 Ultra 화이트 512GB 풀박스입니다.
구성은 S25 Ultra 본체, 미사용 정품 스탠딩 커버, 미개봉 클리어 커버, 박스, 보호필름 1장입니다.
사진과 같이 S급이고 번인·찍힘이 없으며 떨어뜨린 적도 없습니다.
자급제입니다.`;

export const demoResult: AnalysisResult = {
  claims: [
    {
      id: 'claim-1',
      statement: '갤럭시 S22 Ultra 화이트 512GB 풀박스',
      verdict: 'possible_conflict',
      imageIndex: 1,
      evidence: '사진에는 Galaxy S22 Ultra 박스와 관련 구성품이 보이지만 본문에는 S25 Ultra 본체라고 적혀 있어 기기명이 서로 맞지 않을 가능성이 있습니다.',
      box: { x: 0.02, y: 0.01, width: 0.96, height: 0.98 },
      confidence: 0.91,
    },
    {
      id: 'claim-2',
      statement: 'S급이고 찍힘이 없음',
      verdict: 'possible_conflict',
      imageIndex: 3,
      evidence: '모서리에 색상 변화나 사용 흔적으로 보이는 영역이 있습니다. 조명 반사일 수도 있어 밝은 곳에서 촬영한 근접 사진이 필요합니다.',
      box: { x: 0.42, y: 0.28, width: 0.38, height: 0.4 },
      confidence: 0.78,
    },
    {
      id: 'claim-3',
      statement: '자가진단 23개 항목 완료',
      verdict: 'confirmed',
      imageIndex: 2,
      evidence: '사진의 휴대폰 진단 화면에 정상 23, 확인 필요 0이 표시됩니다. 화면에 표시된 결과만 확인된 것이며 장기 작동 상태를 보증하지는 않습니다.',
      box: { x: 0.18, y: 0.08, width: 0.64, height: 0.84 },
      confidence: 0.88,
    },
    {
      id: 'claim-4',
      statement: '번인 없음·낙하 이력 없음·자급제',
      verdict: 'not_verifiable',
      imageIndex: null,
      evidence: '정지 사진만으로 번인, 과거 낙하 이력, 자급제 여부를 확인할 수 없습니다.',
      box: null,
      confidence: 0.97,
    },
  ],
  visualFindings: [
    {
      id: 'finding-1',
      title: '모서리 사용 흔적 후보',
      detail: '세 번째 사진의 모서리와 프레임 경계에 판매글에서 별도로 설명하지 않은 색상 변화가 보입니다. 찍힘으로 확정하지 않고 추가 사진으로 확인해야 합니다.',
      imageIndex: 3,
      box: { x: 0.42, y: 0.28, width: 0.38, height: 0.4 },
      confidence: 0.74,
    },
  ],
  summary: {
    headline: 'S22와 S25 표기가 섞여 있어 정확한 모델 확인이 필요합니다.',
    caution: '사진에는 S22 Ultra 관련 구성품이 보이지만 외관 등급과 자급제·번인·낙하 이력은 추가 근거가 필요합니다.',
    counts: {
      confirmed: 1,
      possible_conflict: 2,
      not_verifiable: 1,
      unmentioned_visual_issue: 1,
    },
  },
  sellerQuestions: [
    '본문의 “S25 Ultra 본체”는 “S22 Ultra 본체”의 오기인가요?',
    '모델명이 보이는 설정 > 휴대전화 정보 화면 사진을 받을 수 있을까요?',
    '네 모서리와 프레임을 밝은 곳에서 촬영한 근접 사진을 받을 수 있을까요?',
    '번인 확인용 단색 화면 사진 또는 작동 영상을 받을 수 있을까요?',
  ],
};

export const analysisJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['claims', 'visualFindings', 'summary', 'sellerQuestions'],
  properties: {
    claims: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'statement', 'verdict', 'imageIndex', 'evidence', 'box', 'confidence'],
        properties: {
          id: { type: 'string' },
          statement: { type: 'string' },
          verdict: { type: 'string', enum: VERDICTS },
          imageIndex: { type: ['integer', 'null'] },
          evidence: { type: 'string' },
          box: { $ref: '#/$defs/box' },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
        },
      },
    },
    visualFindings: {
      type: 'array',
      description: '판매글에서 언급하지 않았고 사진에 새롭게 보이는 외관 특징만 포함합니다. 정상 진단 화면이나 이미 고지된 결함은 제외합니다.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'title', 'detail', 'imageIndex', 'box', 'confidence'],
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          detail: { type: 'string' },
          imageIndex: { type: 'integer' },
          box: { $ref: '#/$defs/box' },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
        },
      },
    },
    summary: {
      type: 'object',
      additionalProperties: false,
      required: ['headline', 'caution', 'counts'],
      properties: {
        headline: { type: 'string' },
        caution: { type: 'string' },
        counts: {
          type: 'object',
          additionalProperties: false,
          required: VERDICTS,
          properties: Object.fromEntries(VERDICTS.map((key) => [key, { type: 'integer', minimum: 0 }])),
        },
      },
    },
    sellerQuestions: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 5 },
  },
  $defs: {
    box: {
      anyOf: [
        { type: 'null' },
        {
          type: 'object',
          additionalProperties: false,
          required: ['x', 'y', 'width', 'height'],
          properties: {
            x: { type: 'number', minimum: 0, maximum: 1 },
            y: { type: 'number', minimum: 0, maximum: 1 },
            width: { type: 'number', minimum: 0, maximum: 1 },
            height: { type: 'number', minimum: 0, maximum: 1 },
          },
        },
      ],
    },
  },
} as const;
