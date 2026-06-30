import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "저수지 수위 통합 모니터링",
  description: "주요 관측소 실시간 수위 · 임계치 · 통신 상태 모니터링",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
