import type { Metadata, Viewport } from "next";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { AnalyticsScript } from "@/components/analytics/analytics-script";
import { AdSenseScript } from "@/components/ads/adsense-script";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://pet.dudle.co.kr";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "두들펫 — 우리 동네 반려동물 시설 정보", template: "%s | 두들펫" },
  description: "공식 등록 동물병원·동물약국·반려동물 장례시설과 지역 진료비 통계를 확인하세요.",
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
    other: process.env.NAVER_SITE_VERIFICATION
      ? { "naver-site-verification": process.env.NAVER_SITE_VERIFICATION }
      : undefined,
  },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#f7fbfd" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" data-scroll-behavior="smooth">
      <body>
        <a className="sr-only focus:not-sr-only" href="#main-content">본문 바로가기</a>
        <Header />
        <main id="main-content">{children}</main>
        <Footer />
        <AnalyticsScript />
        <AdSenseScript />
      </body>
    </html>
  );
}
