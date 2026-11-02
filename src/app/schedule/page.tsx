"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useStore } from "@/lib/store";
import type { Lecture } from "@/lib/types";
import { WEEK, instructorsOf, orgOf } from "@/lib/package";
import { LectureList } from "@/components/LectureCard";
import { useLectureEditor } from "@/components/LectureEditorHost";

const pad = (n: number) => String(n).padStart(2, "0");
const todayIso = () => new Date().toISOString().slice(0, 10);

function addMonths(m: string, n: number) {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(y, mo - 1 + n, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

function Schedule() {
  const { data } = useStore();
  const router = useRouter();
  const params = useSearchParams();
  const [view, setView] = useState<"list" | "cal">("list");
  const [month, setMonth] = useState("all");
  const [cal, setCal] = useState(todayIso().slice(0, 7));
  const [sel, setSel] = useState(todayIso());
  const [q, setQ] = useState("");
  const ed = useLectureEditor();

  // 다른 화면에서 ?edit=일정ID 또는 ?new=1 로 들어오면 팝업을 열고 주소는 깨끗이 정리합니다.
  useEffect(() => {
    if (!data) return;
    const id = params.get("edit");
    if (id && data.lectures.some((x) => x.id === id)) ed.edit(id);
    else if (params.get("new")) ed.create();
    else return;
    router.replace("/schedule");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!data, params]);

  const list = useMemo(() => {
    if (!data) return [];
    const m = view === "cal" ? cal : month;
    return data.lectures
      .filter((l) => m === "all" || l.date.startsWith(m))
      .filter((l) => {
        if (!q) return true;
        const t = [orgOf(data, l)?.name, l.area, l.source, l.period, l.target, l.subject, l.note, ...instructorsOf(data, l).map((i) => i.name)].join(" ");
        return t.includes(q);
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [data, view, cal, month, q]);

  if (!data) return <p className="muted">불러오는 중…</p>;

  const months = Array.from(new Set(data.lectures.map((l) => l.date.slice(0, 7)))).sort();
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="h1">교육·일정관리</h1>
        <button className="btn btn-primary" onClick={() => ed.create(view === "cal" ? sel : undefined)}>
          강의의뢰 등록
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        <div className="flex gap-1">
          {(["list", "cal"] as const).map((v) => (
            <button key={v} className={`btn ${view === v ? "border-accent bg-accent-soft text-accent" : ""}`} aria-pressed={view === v} onClick={() => setView(v)}>
              {v === "list" ? "목록" : "달력"}
            </button>
          ))}
        </div>
        {view === "list" && (
          <select className="input w-auto" value={month} onChange={(e) => setMonth(e.target.value)} aria-label="월">
            <option value="all">전체 기간</option>
            {months.map((m) => (
              <option key={m} value={m}>
                {m.slice(0, 4)}년 {Number(m.slice(5))}월
              </option>
            ))}
          </select>
        )}
        <input className="input flex-1 basis-48" type="search" placeholder="기관, 대상, 과목, 강사 검색" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {view === "cal" ? (
        <Calendar month={cal} setMonth={setCal} sel={sel} setSel={setSel} lectures={list} orgName={(l) => orgOf(data, l)?.name ?? ""} />
      ) : null}

      {view === "list" ? (
        <LectureList data={data} list={list} empty="조건에 맞는 일정이 없습니다." />
      ) : (
        <div className="grid gap-2">
          <h2 className="h2">
            {Number(sel.slice(5, 7))}월 {Number(sel.slice(8))}일 출강
          </h2>
          <LectureList data={data} list={list.filter((l) => l.date === sel)} empty="이 날은 출강이 없습니다." />
        </div>
      )}

    </div>
  );
}

function Calendar({
  month, setMonth, sel, setSel, lectures, orgName,
}: {
  month: string;
  setMonth: (m: string) => void;
  sel: string;
  setSel: (d: string) => void;
  lectures: Lecture[];
  orgName: (l: Lecture) => string;
}) {
  const [y, m] = month.split("-").map(Number);
  const first = new Date(y, m - 1, 1).getDay();
  const days = new Date(y, m, 0).getDate();
  const cells: (number | null)[] = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  return (
    <div className="card p-3">
      <div className="mb-2 flex items-center gap-2">
        <button className="btn" aria-label="이전 달" onClick={() => setMonth(addMonths(month, -1))}>
          ‹
        </button>
        <b className="min-w-28 text-center text-base">
          {y}년 {m}월
        </b>
        <button className="btn" aria-label="다음 달" onClick={() => setMonth(addMonths(month, 1))}>
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {WEEK.map((w, i) => (
          <div key={w} className={`py-1 text-center text-xs ${i === 0 ? "text-bad" : "text-muted"}`}>
            {w}
          </div>
        ))}
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const iso = `${month}-${pad(d)}`;
          const ls = lectures.filter((l) => l.date === iso);
          return (
            <button
              key={i}
              onClick={() => setSel(iso)}
              className={`flex min-h-16 min-w-0 flex-col gap-0.5 overflow-hidden rounded border p-1 text-left ${iso === sel ? "border-accent outline-2 outline-accent" : "border-line"} bg-surface`}
            >
              <span className={`text-xs font-bold ${i % 7 === 0 ? "text-bad" : ""}`}>{d}</span>
              {ls.slice(0, 2).map((l) => (
                <span key={l.id} className={`truncate rounded px-1 text-[11px] ${l.sendLogs.length ? "bg-ok-soft" : "bg-warn-soft"}`}>
                  {orgName(l).replace("등학교", "").replace("학교", "")}
                </span>
              ))}
              {ls.length > 2 && <span className="text-[11px] text-muted">+{ls.length - 2}</span>}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-muted">
        <span className="rounded bg-warn-soft px-1">노랑</span> 서류 발송 전 · <span className="rounded bg-ok-soft px-1">초록</span> 서류 발송 완료
      </p>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<p className="muted">불러오는 중…</p>}>
      <Schedule />
    </Suspense>
  );
}
