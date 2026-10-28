"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Building2, CalendarDays, ClipboardList, Files, GraduationCap, LayoutGrid, Menu, Settings, Users, Wallet, X,
} from "lucide-react";
import { useStore } from "@/lib/store";

export const MENU = [
  { href: "/", label: "대시보드", icon: LayoutGrid },
  { href: "/orgs", label: "기관관리", icon: Building2 },
  { href: "/schedule", label: "교육·일정관리", icon: CalendarDays },
  { href: "/instructors", label: "강사관리", icon: Users },
  { href: "/documents", label: "행정서류", icon: Files },
  { href: "/settlement", label: "정산관리", icon: Wallet },
  { href: "/meetings", label: "회의록·업무", icon: ClipboardList },
  { href: "/settings", label: "설정", icon: Settings },
] as const;

// 서류 패키지·보관함 화면은 '행정서류' 아래에 있는 것으로 표시합니다.
function activeHref(path: string) {
  if (path.startsWith("/package") || path.startsWith("/vault")) return "/documents";
  return MENU.find((m) => m.href !== "/" && path.startsWith(m.href))?.href ?? (path === "/" ? "/" : "");
}

const MOBILE_TABS = ["/", "/schedule", "/documents", "/instructors"];

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2 text-[17px] font-bold text-ink">
      <GraduationCap className="size-5" strokeWidth={1.8} />
      출강매니저
    </Link>
  );
}

function MenuList({ active, onPick }: { active: string; onPick?: () => void }) {
  return (
    <nav className="grid gap-0.5">
      {MENU.map(({ href, label, icon: Icon }) => {
        const on = href === active;
        return (
          <Link
            key={href}
            href={href}
            onClick={onPick}
            className={`flex items-center gap-3 rounded px-3 py-2 text-[13.5px] ${on ? "bg-[#f1f3f6] font-bold text-ink" : "text-[#4b5563] hover:bg-[#f7f8fa] hover:text-ink"}`}
          >
            <Icon className="size-[18px]" strokeWidth={1.6} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export default function Nav({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const active = activeHref(path);
  const current = MENU.find((m) => m.href === active);
  const [drawer, setDrawer] = useState(false);
  const { resetDemo } = useStore();
  const reset = () => {
    if (confirm("데모 데이터를 처음 상태로 되돌릴까요? 이 브라우저에서 고친 내용이 모두 지워집니다.")) resetDemo();
  };

  return (
    <div className="min-h-screen md:grid md:grid-cols-[224px_minmax(0,1fr)]">
      {/* PC: 왼쪽 메뉴 */}
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-line bg-surface px-3 py-5 md:flex">
        <div className="px-3 pb-6">
          <Brand />
          <p className="mt-0.5 pl-7 text-[11px] text-muted">바움사회적협동조합</p>
        </div>
        <MenuList active={active} />
        <div className="mt-auto grid gap-2 px-3 text-xs text-muted">
          <span>
            <span className="rounded bg-warn-soft px-1.5 py-0.5 font-medium text-warn">데모 데이터</span> 모든 이름·연락처는 가짜입니다
          </span>
          <button className="w-fit text-left underline hover:text-ink" onClick={reset}>
            데모 초기화
          </button>
        </div>
      </aside>

      <div className="min-w-0">
        {/* 위쪽 막대: PC는 현재 위치와 사용자, 휴대폰은 로고와 메뉴 버튼 */}
        <header className="sticky top-0 z-20 flex h-[52px] items-center justify-between border-b border-line bg-surface px-4 md:px-6">
          <div className="hidden text-sm text-muted md:block">
            홈{current && current.href !== "/" && <> / <b className="text-ink">{current.label}</b></>}
          </div>
          <div className="md:hidden">
            <Brand />
          </div>
          <div className="flex items-center gap-2.5 text-sm text-[#4b5563]">
            <span className="hidden sm:inline">김지혜 · 관리자</span>
            <span className="grid size-7 place-items-center rounded-full bg-[#1e2a3b] text-xs text-white">김</span>
            <button className="md:hidden" aria-label="전체 메뉴" onClick={() => setDrawer(true)}>
              <Menu className="size-6" />
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 pt-5 pb-28 md:px-6 md:pt-6 md:pb-16">{children}</main>
      </div>

      {/* 휴대폰: 아래쪽 탭 */}
      <nav className="fixed inset-x-0 bottom-0 z-20 flex justify-around border-t border-line bg-surface pt-1.5 pb-[max(env(safe-area-inset-bottom),10px)] md:hidden">
        {MENU.filter((m) => MOBILE_TABS.includes(m.href)).map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={`grid justify-items-center gap-0.5 px-2 text-[11px] ${active === href ? "font-bold text-accent" : "text-[#8b95a1]"}`}>
            <Icon className="size-5" strokeWidth={1.7} />
            {label.replace("교육·일정관리", "일정").replace("강사관리", "강사")}
          </Link>
        ))}
        <button onClick={() => setDrawer(true)} className="grid justify-items-center gap-0.5 px-2 text-[11px] text-[#8b95a1]">
          <Menu className="size-5" strokeWidth={1.7} />
          더보기
        </button>
      </nav>

      {/* 휴대폰: 전체 메뉴 */}
      {drawer && (
        <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setDrawer(false)}>
          <div className="ml-auto flex h-full w-64 flex-col bg-surface p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <Brand />
              <button aria-label="닫기" onClick={() => setDrawer(false)}>
                <X className="size-5" />
              </button>
            </div>
            <MenuList active={active} onPick={() => setDrawer(false)} />
            <button className="btn btn-sm mt-auto" onClick={reset}>
              데모 초기화
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
