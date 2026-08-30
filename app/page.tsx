/* oxlint-disable next/no-img-element */
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle, ArrowRight, Camera, Check, CheckCircle2, ChevronRight, Clipboard,
  Eye, ImagePlus, LoaderCircle, MessageSquareText, SearchCheck, ShieldCheck,
  Sparkles, Upload, Video,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { demoListing, demoResult, type AnalysisResult, type ClaimResult, type Verdict } from '@/lib/analysis';

const demoImages = [
  { src: '/demo/galaxy-s22-fullset.webp', alt: 'Galaxy S22 Ultra 본체와 박스, 케이스 구성 사진' },
  { src: '/demo/galaxy-s22-diagnostics.webp', alt: '휴대폰 자가진단 23개 항목 완료 화면' },
  { src: '/demo/galaxy-s22-corner.webp', alt: 'Galaxy S22 Ultra 모서리 근접 사진' },
];

const verdicts: Record<Verdict, { label: string; shortLabel: string; tone: string; dot: string; icon: typeof CheckCircle2 }> = {
  confirmed: { label: '사진에서 확인됨', shortLabel: '확인됨', tone: 'border-emerald-200 bg-emerald-50 text-emerald-800', dot: 'bg-emerald-500', icon: CheckCircle2 },
  possible_conflict: { label: '주장과 다를 가능성', shortLabel: '모순 가능성', tone: 'border-amber-200 bg-amber-50 text-amber-900', dot: 'bg-amber-500', icon: AlertCircle },
  not_verifiable: { label: '사진으로 확인 불가', shortLabel: '확인 불가', tone: 'border-sky-200 bg-sky-50 text-sky-900', dot: 'bg-sky-500', icon: Eye },
  unmentioned_visual_issue: { label: '미고지 외관 특징', shortLabel: '추가 특징', tone: 'border-violet-200 bg-violet-50 text-violet-900', dot: 'bg-violet-500', icon: SearchCheck },
};

type AppState = 'ready' | 'analyzing' | 'success' | 'error';

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [listingText, setListingText] = useState(demoListing);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [result, setResult] = useState<AnalysisResult | null>(demoResult);
  const [state, setState] = useState<AppState>('ready');
  const [isDemo, setIsDemo] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<number | null>(null);
  const [activeClaim, setActiveClaim] = useState<ClaimResult>(demoResult.claims[0]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [analysisMode, setAnalysisMode] = useState<'demo' | 'live'>('demo');

  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);
  useEffect(() => {
    if (state !== 'analyzing') return;
    const timer = window.setInterval(() => setProgress((value) => value >= 88 ? value : value + Math.max(3, Math.round((90 - value) / 5))), 420);
    return () => window.clearInterval(timer);
  }, [state]);

  const shownImages = useMemo(() => previews.length ? previews.map((src) => ({ src, alt: '업로드한 상품 사진' })) : demoImages, [previews]);

  function addFiles(incoming: FileList | null) {
    if (!incoming) return;
    const next = Array.from(incoming).filter((file) => file.type.startsWith('image/')).slice(0, 6);
    previews.forEach((url) => URL.revokeObjectURL(url));
    setFiles(next);
    setPreviews(next.map((file) => URL.createObjectURL(file)));
    setSelectedImageIndex(0);
    setIsDemo(false);
    setError('');
  }

  function loadDemo() {
    previews.forEach((url) => URL.revokeObjectURL(url));
    setFiles([]); setPreviews([]); setListingText(demoListing); setResult(demoResult);
    setActiveClaim(demoResult.claims[0]); setSelectedImageIndex(0); setAnalysisMode('demo'); setIsDemo(true); setState('ready'); setError('');
  }

  async function analyze() {
    if (!listingText.trim()) { setError('판매글 내용을 붙여 넣어 주세요.'); setState('error'); return; }
    if (!isDemo && files.length === 0) { setError('상품 사진을 한 장 이상 올려 주세요.'); setState('error'); return; }
    setState('analyzing'); setError(''); setProgress(18);
    const body = new FormData();
    body.set('listingText', listingText); body.set('demoMode', String(isDemo));
    files.forEach((file) => body.append('images', file));
    try {
      const response = await fetch('/api/analyze', { method: 'POST', body });
      const data = (await response.json()) as AnalysisResult & { error?: string; mode?: 'demo' | 'live' };
      if (!response.ok) throw new Error(data.error || '분석에 실패했습니다.');
      setProgress(100); setResult(data); setAnalysisMode(data.mode === 'live' ? 'live' : 'demo'); if (data.claims[0]) { setActiveClaim(data.claims[0]); setSelectedImageIndex(Math.max(0, (data.claims[0].imageIndex ?? 1) - 1)); } setState('success');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '분석에 실패했습니다.'); setState('error');
    }
  }

  async function copyQuestion(question: string, index: number) {
    await navigator.clipboard.writeText(question); setCopied(index); window.setTimeout(() => setCopied(null), 1200);
  }

  function activateFinding(finding: AnalysisResult['visualFindings'][number]) {
    const claim: ClaimResult = {
      id: finding.id,
      statement: finding.title,
      verdict: 'unmentioned_visual_issue',
      imageIndex: finding.imageIndex,
      evidence: finding.detail,
      box: finding.box,
      confidence: finding.confidence,
    };
    setActiveClaim(claim);
    setSelectedImageIndex(Math.max(0, finding.imageIndex - 1));
  }

  function activateClaim(claim: ClaimResult) {
    setActiveClaim(claim);
    if (claim.imageIndex) setSelectedImageIndex(Math.max(0, claim.imageIndex - 1));
  }

  const activeImageIndex = Math.min(selectedImageIndex, Math.max(0, shownImages.length - 1));
  const activeImage = shownImages[activeImageIndex] ?? shownImages[0];
  const evidenceMatchesImage = activeClaim.imageIndex === activeImageIndex + 1;

  return (
    <main className="min-h-screen bg-[var(--canvas)] text-slate-950">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-[color:var(--canvas)]/92 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1480px] items-center justify-between px-4 sm:px-7">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-[13px] bg-slate-950 text-white shadow-sm"><Eye className="size-[18px]" strokeWidth={2.3} /></div>
            <div><p className="font-display text-[17px] font-bold tracking-[-0.03em]">SECOND EYE</p><p className="-mt-0.5 text-[10px] font-semibold tracking-[0.12em] text-slate-500">중고 거래 전 사진 점검</p></div>
          </div>
          <div className="hidden items-center gap-2 text-xs text-slate-500 sm:flex"><ShieldCheck className="size-4 text-emerald-600" />사진은 분석 후 저장하지 않아요<Badge className="ml-2 border-orange-200 bg-orange-50 text-orange-700" variant="outline">HACKATHON MVP</Badge></div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1480px] gap-5 px-4 py-5 sm:px-7 lg:grid-cols-[minmax(340px,0.78fr)_minmax(560px,1.42fr)] lg:gap-6 lg:py-7">
        <section className="self-start rounded-[24px] border border-slate-200 bg-white shadow-[0_16px_50px_rgba(15,23,42,0.05)] lg:sticky lg:top-[92px]">
          <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
            <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-orange-600"><span>01</span><span className="h-px w-5 bg-orange-300" /> 거래 정보 입력</div>
            <h1 className="font-display text-2xl font-bold tracking-[-0.045em] text-slate-950">판매글의 말, 사진과 맞을까요?</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">중고 스마트폰 판매글과 사진을 나란히 대조해 구매 전에 확인할 질문을 정리합니다.</p>
            {isDemo && <p className="mt-3 inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-800">실제 공개 판매글을 비식별화한 내부 평가 사례</p>}
          </div>

          <div className="space-y-6 p-5 sm:p-6">
            <div>
              <div className="mb-2.5 flex items-end justify-between"><label htmlFor="listing" className="text-sm font-bold text-slate-800">판매글 내용</label><span className="text-[11px] tabular-nums text-slate-400">{listingText.length.toLocaleString()} / 5,000</span></div>
              <Textarea id="listing" value={listingText} maxLength={5000} onChange={(event) => { setListingText(event.target.value); setIsDemo(false); }} placeholder="당근·중고나라 판매글 내용을 붙여 넣어 주세요." className="min-h-[196px] resize-none rounded-2xl border-slate-200 bg-slate-50/70 px-4 py-3.5 text-[13px] leading-6 shadow-inner shadow-slate-100 focus-visible:border-orange-400 focus-visible:ring-orange-100" />
            </div>

            <div>
              <div className="mb-2.5 flex items-center justify-between"><span className="text-sm font-bold text-slate-800">상품 사진</span><span className="text-[11px] text-slate-400">JPG, PNG · 최대 6장</span></div>
              <button type="button" onClick={() => inputRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); addFiles(event.dataTransfer.files); }} className="group flex w-full flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-5 py-7 text-center transition hover:border-orange-400 hover:bg-orange-50/40 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-orange-100">
                <span className="mb-3 grid size-11 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition group-hover:-translate-y-0.5 group-hover:text-orange-600"><ImagePlus className="size-5" /></span>
                <span className="text-sm font-semibold text-slate-700">사진을 선택하거나 여기로 끌어오세요</span><span className="mt-1 text-xs text-slate-400">정면·후면·모서리·구성품 사진이 좋아요</span>
              </button>
              <input ref={inputRef} type="file" accept="image/*" multiple className="sr-only" onChange={(event) => addFiles(event.target.files)} />
              {files.length > 0 && <div className="mt-3 grid grid-cols-6 gap-2">{previews.map((src, index) => <div key={src} className="relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-100"><img src={src} alt={`업로드 사진 ${index + 1}`} className="size-full object-cover" /><span className="absolute bottom-1 left-1 rounded-md bg-slate-950/75 px-1.5 py-0.5 text-[9px] font-bold text-white">{index + 1}</span></div>)}</div>}
            </div>

            {state === 'error' && <Alert variant="destructive" className="rounded-xl border-red-200 bg-red-50 px-3.5 py-3"><AlertCircle /><AlertTitle>분석을 시작하지 못했어요</AlertTitle><AlertDescription className="space-y-2"><p>{error}</p><button type="button" onClick={loadDemo} className="font-bold underline underline-offset-2">대표 사례 결과로 계속 보기</button></AlertDescription></Alert>}
            {state === 'analyzing' ? (
              <div className="rounded-2xl border border-orange-200 bg-orange-50/70 p-4"><div className="mb-3 flex items-center gap-3"><LoaderCircle className="size-5 animate-spin text-orange-600" /><div><p className="text-sm font-bold text-slate-900">주장과 사진을 대조하고 있어요</p><p className="text-xs text-slate-500">외관 특징과 확인 불가능한 항목을 분리합니다</p></div></div><Progress value={progress} className="[&_[data-slot=progress-indicator]]:bg-orange-500 [&_[data-slot=progress-track]]:bg-orange-100" /></div>
            ) : (
              <div className="flex gap-2.5"><Button onClick={analyze} size="lg" className="h-12 flex-1 rounded-xl bg-orange-600 px-5 text-sm font-bold text-white shadow-[0_8px_22px_rgba(234,88,12,0.22)] hover:bg-orange-700"><Sparkles data-icon="inline-start" /> AI로 교차 점검 <ArrowRight data-icon="inline-end" /></Button><Button onClick={loadDemo} variant="outline" size="lg" className="h-12 rounded-xl border-slate-200 px-4 text-slate-600 hover:bg-slate-50">대표 사례</Button></div>
            )}
            <p className="flex items-start gap-2 text-[11px] leading-5 text-slate-400"><ShieldCheck className="mt-0.5 size-3.5 shrink-0" />결과는 거래 판단을 돕는 참고 정보입니다. 제품 상태나 거래 안전을 확정하지 않습니다.</p>
          </div>
        </section>

        <section className="min-w-0 space-y-5" aria-live="polite">
          {result ? <>
            <div className="overflow-hidden rounded-[24px] bg-slate-950 text-white shadow-[0_18px_50px_rgba(15,23,42,0.16)]"><div className="grid gap-5 p-5 sm:p-6 xl:grid-cols-[1fr_auto] xl:items-end"><div><div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-orange-400"><span>02</span><span className="h-px w-5 bg-orange-400/70" /> 점검 요약 <span className={`ml-2 rounded-full border px-2 py-0.5 text-[9px] ${analysisMode === 'live' ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300' : 'border-sky-400/40 bg-sky-400/10 text-sky-300'}`}>{analysisMode === 'live' ? 'LIVE 분석' : 'DEMO 결과'}</span></div><h2 className="font-display max-w-2xl text-[25px] font-bold leading-tight tracking-[-0.04em] sm:text-[30px]">{result.summary.headline}</h2><p className="mt-3 max-w-2xl text-xs leading-5 text-slate-400">{result.summary.caution}</p></div><div className="grid grid-cols-4 gap-2 xl:min-w-[360px]">{(Object.keys(verdicts) as Verdict[]).map((verdict) => <div key={verdict} className="rounded-xl border border-white/10 bg-white/[0.06] px-2 py-3 text-center"><p className="font-display text-2xl font-bold tabular-nums">{result.summary.counts[verdict]}</p><p className="mt-0.5 text-[10px] text-slate-400">{verdicts[verdict].shortLabel}</p></div>)}</div></div></div>

            <div className="grid gap-5 xl:grid-cols-[minmax(280px,0.9fr)_minmax(360px,1.1fr)]">
              <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_12px_36px_rgba(15,23,42,0.045)]">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><p className="text-sm font-bold text-slate-900">사진 근거</p><p className="text-[11px] text-slate-400">썸네일 또는 대조 항목을 선택하세요</p></div><Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">사진 {activeImageIndex + 1}</Badge></div>
                <div className="p-3"><div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-slate-100">{activeImage && <img src={activeImage.src} alt={activeImage.alt} className="size-full object-cover" />}{activeClaim.box && evidenceMatchesImage ? <div className="absolute border-2 border-orange-500 bg-orange-400/15 shadow-[0_0_0_999px_rgba(15,23,42,0.20)]" style={{ left: `${activeClaim.box.x * 100}%`, top: `${activeClaim.box.y * 100}%`, width: `${activeClaim.box.width * 100}%`, height: `${activeClaim.box.height * 100}%` }}><span className="absolute -top-7 left-0 whitespace-nowrap rounded-md bg-orange-600 px-2 py-1 text-[10px] font-bold text-white">근거 영역</span></div> : activeClaim.verdict === 'not_verifiable' ? <div className="absolute inset-x-4 bottom-4 rounded-xl bg-slate-950/80 p-3 text-xs text-white backdrop-blur"><Video className="mr-2 inline size-4 text-sky-300" />사진만으로 확인할 수 없는 항목입니다.</div> : activeClaim.imageIndex && !evidenceMatchesImage ? <div className="absolute inset-x-4 bottom-4 rounded-xl bg-slate-950/80 p-3 text-xs text-white backdrop-blur"><Camera className="mr-2 inline size-4 text-orange-300" />이 항목의 근거는 사진 {activeClaim.imageIndex}에 있습니다.</div> : null}</div></div>
                <div className="flex gap-2 overflow-x-auto px-3 pb-3">{shownImages.map((image, index) => <button type="button" aria-label={`사진 ${index + 1} 크게 보기`} aria-pressed={index === activeImageIndex} onClick={() => setSelectedImageIndex(index)} key={`${image.src}-${index}`} className={`relative size-14 shrink-0 overflow-hidden rounded-xl border-2 transition focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-orange-200 ${index === activeImageIndex ? 'border-orange-500 shadow-sm' : 'border-transparent hover:border-slate-300'}`}><img src={image.src} alt={image.alt} className="size-full object-cover" /><span className="absolute bottom-0.5 left-1 rounded bg-slate-950/65 px-1 text-[9px] font-bold text-white">{index + 1}</span></button>)}</div>
              </div>

              <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_12px_36px_rgba(15,23,42,0.045)] sm:p-5">
                <div className="mb-4 flex items-center justify-between"><div><p className="text-sm font-bold text-slate-900">주장별 대조 결과</p><p className="text-[11px] text-slate-400">항목을 눌러 사진 근거를 확인하세요</p></div><SearchCheck className="size-5 text-slate-400" /></div>
                <div className="space-y-2.5">{result.claims.map((claim) => {
                  const config = verdicts[claim.verdict]; const Icon = config.icon; const selected = activeClaim.id === claim.id;
                  return <button key={claim.id} type="button" onClick={() => activateClaim(claim)} className={`w-full rounded-2xl border p-3.5 text-left transition ${selected ? 'border-slate-900 bg-slate-50 shadow-sm' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'}`}><div className="flex items-start gap-3"><span className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl border ${config.tone}`}><Icon className="size-4" /></span><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center justify-between gap-2"><span className="text-[13px] font-bold text-slate-900">“{claim.statement}”</span><span className="text-[10px] font-semibold text-slate-400">확신 {Math.round(claim.confidence * 100)}%</span></span><span className={`mt-2 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${config.tone}`}><span className={`mr-1.5 mt-1 size-1.5 rounded-full ${config.dot}`} />{config.label}</span><span className="mt-2 block text-xs leading-5 text-slate-500">{claim.evidence}</span></span><ChevronRight className={`mt-2 size-4 shrink-0 ${selected ? 'text-slate-900' : 'text-slate-300'}`} /></div></button>;
                })}{result.visualFindings.map((finding) => <button type="button" onClick={() => activateFinding(finding)} key={finding.id} className={`w-full rounded-2xl border bg-violet-50/60 p-3.5 text-left transition hover:bg-violet-50 ${activeClaim.id === finding.id ? 'border-violet-700 shadow-sm' : 'border-violet-200'}`}><div className="flex gap-3"><span className="grid size-8 shrink-0 place-items-center rounded-xl border border-violet-200 bg-white text-violet-700"><Camera className="size-4" /></span><div><div className="flex flex-wrap items-center gap-2"><p className="text-[13px] font-bold text-slate-900">{finding.title}</p><Badge className="border-violet-200 bg-violet-100 text-violet-800" variant="outline">미고지 외관 특징</Badge></div><p className="mt-1 text-xs leading-5 text-slate-500">{finding.detail}</p></div><ChevronRight className="ml-auto mt-2 size-4 shrink-0 text-violet-300" /></div></button>)}</div>
              </div>
            </div>

            <div className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_12px_36px_rgba(15,23,42,0.045)] sm:p-6">
              <div className="mb-5 flex items-start justify-between gap-4"><div><div className="mb-1.5 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-orange-600"><span>03</span><span className="h-px w-5 bg-orange-300" /> 판매자에게 물어보기</div><h3 className="font-display text-xl font-bold tracking-[-0.035em]">그대로 보내도 되는 추가 질문</h3></div><MessageSquareText className="size-6 shrink-0 text-slate-300" /></div>
              <div className="grid gap-3 lg:grid-cols-3">{result.sellerQuestions.map((question, index) => <div key={question} className="group flex min-h-36 flex-col rounded-2xl border border-slate-200 bg-slate-50/60 p-4 transition hover:border-orange-200 hover:bg-orange-50/40"><div className="mb-3 flex items-center gap-2"><span className="grid size-6 place-items-center rounded-lg bg-slate-950 text-[10px] font-bold text-white">{index + 1}</span><span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">추가 확인</span></div><p className="flex-1 text-[13px] font-medium leading-5 text-slate-700">{question}</p><button onClick={() => copyQuestion(question, index)} className="mt-3 flex items-center gap-1.5 self-start text-[11px] font-bold text-slate-500 transition hover:text-orange-700">{copied === index ? <Check className="size-3.5" /> : <Clipboard className="size-3.5" />}{copied === index ? '복사됨' : '질문 복사'}</button></div>)}</div>
            </div>
          </> : <div className="grid min-h-[560px] place-items-center rounded-[24px] border border-dashed border-slate-300 bg-white p-8 text-center"><div><span className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-slate-100 text-slate-500"><Upload className="size-6" /></span><h2 className="font-display text-xl font-bold">분석 결과가 여기에 표시됩니다</h2><p className="mt-2 text-sm text-slate-500">판매글과 사진을 입력하고 교차 점검을 시작하세요.</p></div></div>}
        </section>
      </div>
    </main>
  );
}
