"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStore } from "@/lib/store";

const LINKS = [
  ["/", "홈"],
  ["/schedule", "일정"],
  ["/instructors", "강사"],
  ["/orgs", "기관"],
  ["/vault", "보관함"],
  ["/settings", "설정"],
] as const;

export default function Nav() {
  const path = usePathname();
  const { resetDemo } = useStore();
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2">
        <Link href="/" className="mr-2 text-lg font-bold text-accent">
          출강매니저
        </Link>
        <nav className="flex flex-1 gap-1 overflow-x-auto">
          {LINKS.map(([href, label]) => {
            const on = href === "/" ? path === "/" : path.startsWith(href) || (href === "/schedule" && path.startsWith("/package"));
            return (
              <Link
                key={href}
                href={href}
                className={`rounded-md px-3 py-1.5 whitespace-nowrap ${on ? "bg-accent-soft font-bold text-accent" : "text-muted hover:text-ink"}`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
        <span className="chip chip-warn" title="모든 이름·연락처·계좌는 가짜 데이터입니다">데모 데이터</span>
        <button
          className="btn btn-sm"
          onClick={() => {
            if (confirm("데모 데이터를 처음 상태로 되돌릴까요? 이 브라우저에서 고친 내용이 모두 지워집니다.")) resetDemo();
          }}
        >
          데모 초기화
        </button>
      </div>
    </header>
  );
}
