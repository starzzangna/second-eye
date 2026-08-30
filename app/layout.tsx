import type { Metadata } from 'next';
import { Geist, Noto_Sans_KR } from 'next/font/google';
import './globals.css';

const geist = Geist({ variable: '--font-geist', subsets: ['latin'] });
const notoSansKr = Noto_Sans_KR({
  variable: '--font-noto-kr',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: 'Second Eye — 중고 거래 전 사진 점검',
  description: '판매글의 주장과 상품 사진을 대조해 구매 전에 확인할 항목과 판매자 질문을 정리합니다.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body className={`${geist.variable} ${notoSansKr.variable}`}>{children}</body></html>;
}
