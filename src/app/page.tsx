"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useStore } from "@/lib/store";
import { docStatus, feeTotal } from "@/lib/package";
import { LectureList } from "@/components/LectureCard";

const todayIso = () => new Date().toISOString().slice(0, 10);

export default function Home() {
  const { data } = useStore();
  if (!data) return <p className="muted">불러오는 중…</p>;
  const today = todayIso();
  const month = today.slice(0, 7);
  const upcoming = data.lectures.filter((l) => l.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  const st = new Map(upcoming.map((l) => [l.id, docStatus(data, l).kind]));
  const ready = upcoming.filter((l) => st.get(l.id) === "ready");
  const check = upcoming.filter((l) => st.get(l.id) === "check");
  const thisMonth = data.lectures.filter((l) => l.date.startsWith(month));
  const fee = upcoming.reduce((s, l) => s + (feeTotal(l) ?? 0), 0);

  const kpi = (label: string, value: string, tone = "") => (
    <div className="card px-4 py-3">
      <span className="text-xs text-muted">{label}</span>
      <b className={`mt-0.5 block text-[22px] tabular-nums ${tone}`}>{value}</b>
    </div>
  );

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="h1">대시보드</h1>
          <p className="text-sm text-muted">강의의뢰를 등록하면 행정서류 5종을 만들어 확인하고, 수락하면 zip으로 묶어 기관에 메일로 보냅니다.</p>
        </div>
        <Link href="/schedule?new=1" className="btn btn-primary hidden md:inline-flex">
          <Plus className="size-4" /> 강의의뢰 등록
        </Link>
      </div>

      {/* 휴대폰: 할 일 요약 */}
      {(ready.length > 0 || check.length > 0) && (
        <div className="rounded-xl bg-warn-soft px-4 py-3 font-semibold text-warn md:hidden">
          서류를 보내야 하는 출강 {ready.length}건
          {check.length > 0 && <small className="block font-normal">확인이 필요한 출강 {check.length}건</small>}
        </div>
      )}

      <section className="hidden grid-cols-4 gap-3 md:grid">
        {kpi("이번 달 출강", `${thisMonth.length}건`)}
        {kpi("서류 발송 전", `${ready.length}건`, ready.length ? "text-warn" : "")}
        {kpi("확인 필요", `${check.length}건`, check.length ? "text-bad" : "")}
        {kpi("다가오는 출강 강사료", `${fee.toLocaleString("ko-KR")}원`)}
      </section>

      <section className="grid gap-2.5">
        <div className="flex items-center justify-between">
          <h2 className="h2">서류를 보내야 하는 출강</h2>
          <Link href="/schedule" className="text-sm text-muted hover:text-accent">
            전체 일정 →
          </Link>
        </div>
        <LectureList data={data} list={[...check, ...ready].sort((a, b) => a.date.localeCompare(b.date))} empty="서류를 보내야 하는 출강이 없습니다." />
      </section>

      <Link
        href="/schedule?new=1"
        className="fixed right-4 bottom-20 z-10 flex items-center gap-1 rounded-full bg-accent px-5 py-3.5 font-bold text-white shadow-lg md:hidden"
      >
        <Plus className="size-4" /> 의뢰 등록
      </Link>
    </div>
  );
}
