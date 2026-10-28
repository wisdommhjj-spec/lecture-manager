import type { Metadata } from "next";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "출강매니저",
  description: "바움사회적협동조합 출강 일정·행정서류 패키지 관리",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="antialiased">
        <StoreProvider>
          <Nav />
          <main className="mx-auto max-w-6xl px-4 pt-5 pb-16">{children}</main>
        </StoreProvider>
      </body>
    </html>
  );
}
