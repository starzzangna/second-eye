import OpenAI from 'openai';
import { analysisJsonSchema, analysisResultSchema, demoResult, normalizeAnalysisResult } from '@/lib/analysis';

export const runtime = 'nodejs';

const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const dailyUsage = new Map<string, { day: string; count: number }>();
const activeRequests = new Set<string>();

function getClientKey(request: Request) {
  return request.headers.get('cf-connecting-ip')
    || request.headers.get('x-real-ip')
    || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || null;
}

function consumeDailyRequest(clientKey: string | null) {
  if (!clientKey) return { allowed: true, remaining: null };
  const limit = Math.max(1, Number(process.env.SECOND_EYE_DAILY_LIMIT || 10));
  const day = new Date().toISOString().slice(0, 10);
  const current = dailyUsage.get(clientKey);
  const count = current?.day === day ? current.count : 0;
  if (count >= limit) return { allowed: false, remaining: 0 };
  dailyUsage.set(clientKey, { day, count: count + 1 });
  return { allowed: true, remaining: limit - count - 1 };
}

const systemPrompt = `당신은 한국 중고 스마트폰 거래 전 점검 도우미입니다.
먼저 판매글을 검증 가능한 원자적 주장으로 나눈 뒤 각 주장을 사진 근거와 대조하세요.
confirmed는 사진에 직접 보이거나 화면·박스 표기를 읽을 수 있을 때만 사용합니다. 판매자가 이미 고지한 결함이 사진에 보이면 confirmed입니다.
possible_conflict는 판매글 내부 표현이 서로 다르거나 사진과 주장이 맞지 않을 가능성이 있을 때 사용합니다.
사진으로 확인할 수 없는 작동 상태, 수리 이력, 소유권, 정상 해지, 낙하 이력 등은 반드시 not_verifiable로 둡니다.
visualFindings에는 판매글에 언급되지 않았고 사진에서 새로 발견한 외관 특징만 넣으세요. 정상 진단 결과, 구성품 표기, 이미 고지된 결함은 visualFindings에 넣지 마세요.
빛 반사, 먼지, 압축 노이즈를 파손으로 단정하지 마세요. 불확실하면 확신도를 낮추고 추가 사진 또는 작동 영상을 요청하세요.
“사기”, “고장 확정”, “사진 조작 확정”과 같은 단정 표현은 사용하지 마세요.
이미지 번호는 업로드 순서대로 1부터 시작합니다. box 좌표는 0~1 사이의 정규화된 x, y, width, height입니다.
not_verifiable 판정의 imageIndex와 box는 null로 두세요.
summary.counts는 claims의 판정 수를 세고 unmentioned_visual_issue에는 visualFindings 수를 반영하세요.
응답은 한국어로 작성하세요.`;

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const listingValue = form.get('listingText');
    const listingText = typeof listingValue === 'string' ? listingValue.trim() : '';
    const demoMode = form.get('demoMode') === 'true';
    const images = form.getAll('images').filter((item): item is File => item instanceof File);

    if (!listingText) {
      return Response.json({ error: '판매글 내용을 입력해 주세요.' }, { status: 400 });
    }
    if (listingText.length > 5000) {
      return Response.json({ error: '판매글은 5,000자 이내로 입력해 주세요.' }, { status: 400 });
    }
    if (!demoMode && (images.length < 1 || images.length > 6)) {
      return Response.json({ error: '상품 사진을 1장 이상 6장 이하로 올려 주세요.' }, { status: 400 });
    }
    if (images.some((image) => image.size > 8 * 1024 * 1024)) {
      return Response.json({ error: '이미지 한 장의 크기는 8MB 이하여야 합니다.' }, { status: 400 });
    }
    if (images.some((image) => !allowedImageTypes.has(image.type))) {
      return Response.json({ error: 'JPG, PNG, WEBP, GIF 이미지만 분석할 수 있어요.' }, { status: 400 });
    }
    if (images.reduce((total, image) => total + image.size, 0) > 24 * 1024 * 1024) {
      return Response.json({ error: '이미지 전체 크기는 24MB 이하여야 합니다.' }, { status: 400 });
    }

    if (demoMode || !process.env.OPENAI_API_KEY) {
      await new Promise((resolve) => setTimeout(resolve, 900));
      return Response.json({ ...demoResult, mode: 'demo' });
    }

    const clientKey = getClientKey(request);
    const usage = consumeDailyRequest(clientKey);
    if (!usage.allowed) {
      return Response.json(
        { error: '오늘의 무료 분석 횟수를 모두 사용했어요. 대표 사례 데모는 계속 이용할 수 있습니다.', code: 'daily_limit' },
        { status: 429, headers: { 'Retry-After': '3600', 'X-RateLimit-Remaining': '0' } },
      );
    }

    const fingerprint = `${clientKey || 'local'}:${listingText.slice(0, 160)}:${images.map((image) => image.size).join(',')}`;
    if (activeRequests.has(fingerprint)) {
      return Response.json({ error: '같은 분석이 이미 진행 중이에요. 잠시만 기다려 주세요.' }, { status: 409 });
    }
    activeRequests.add(fingerprint);

    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const imageContent = await Promise.all(
        images.map(async (image) => ({
          type: 'input_image' as const,
          image_url: `data:${image.type};base64,${Buffer.from(await image.arrayBuffer()).toString('base64')}`,
          detail: 'high' as const,
        })),
      );

      let lastError: unknown;
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          const response = await openai.responses.create({
          model: 'gpt-5.4-mini',
          store: false,
          instructions: systemPrompt,
          input: [
            {
              role: 'user',
              content: [
                { type: 'input_text', text: `다음 판매글을 첨부 사진과 대조해 주세요.\n\n${listingText}` },
                ...imageContent,
              ],
            },
          ],
          text: {
            format: {
              type: 'json_schema',
              name: 'second_eye_analysis',
              strict: true,
              schema: analysisJsonSchema,
            },
          },
          }, { signal: AbortSignal.timeout(45_000) });
          const parsed = analysisResultSchema.parse(JSON.parse(response.output_text));
          const result = normalizeAnalysisResult(parsed, images.length);
          const headers = usage.remaining === null ? undefined : { 'X-RateLimit-Remaining': String(usage.remaining) };
          return Response.json({ ...result, mode: 'live' }, { headers });
        } catch (attemptError) {
          lastError = attemptError;
          if (attempt === 0) continue;
        }
      }
      throw lastError;
    } finally {
      activeRequests.delete(fingerprint);
    }
  } catch (error) {
    console.error('Second Eye analysis failed', error);
    return Response.json(
      { error: '분석이 잠시 지연되고 있어요. 잠시 후 다시 시도하거나 대표 사례 데모를 이용해 주세요.' },
      { status: 500 },
    );
  }
}
