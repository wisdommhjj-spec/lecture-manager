"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useStore } from "@/lib/store";
import type { Lecture } from "@/lib/types";
import { WEEK, instructorsOf, orgOf } from "@/lib/package";
import LectureCard from "@/components/LectureCard";
import LectureEditor, { blankLecture } from "@/components/LectureEditor";

const pad = (n: number) => String(n).padStart(2, "0");
const todayIso = () => new Date().toISOString().slice(0, 10);

function addMonths(m: string, n: number) {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(y, mo - 1 + n, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

function Schedule() {
  const { data, update } = useStore();
  const router = useRouter();
  const params = useSearchParams();
  const [view, setView] = useState<"list" | "cal">("list");
  const [month, setMonth] = useState("all");
  const [cal, setCal] = useState(todayIso().slice(0, 7));
  const [sel, setSel] = useState(todayIso());
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<{ l: Lecture; isNew: boolean } | null>(null);

  // 다른 화면에서 ?edit=일정ID 또는 ?new=1 로 열 수 있게 합니다.
  useEffect(() => {
    if (!data) return;
    const id = params.get("edit");
    const l = id && data.lectures.find((x) => x.id === id);
    if (l) setEditing({ l, isNew: false });
    else if (params.get("new")) setEditing({ l: blankLecture(data), isNew: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!data, params]);

  const list = useMemo(() => {
    if (!data) return [];
    const m = view === "cal" ? cal : month;
    return data.lectures
      .filter((l) => m === "all" || l.date.startsWith(m))
      .filter((l) => {
        if (!q) return true;
        const t = [orgOf(data, l)?.name, l.target, l.subject, l.note, ...instructorsOf(data, l).map((i) => i.name)].join(" ");
        return t.includes(q);
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [data, view, cal, month, q]);

  if (!data) return <p className="muted">불러오는 중…</p>;

  const months = Array.from(new Set(data.lectures.map((l) => l.date.slice(0, 7)))).sort();
  const close = () => {
    setEditing(null);
    if (params.toString()) router.replace("/schedule");
  };

  function save(l: Lecture) {
    update((d) => ({
      ...d,
      lectures: d.lectures.some((x) => x.id === l.id) ? d.lectures.map((x) => (x.id === l.id ? l : x)) : [...d.lectures, l],
    }));
    close();
  }

  const grouped: [string, Lecture[]][] = [];
  list.forEach((l) => {
    const g = grouped.at(-1);
    if (g && g[0] === l.date) g[1].push(l);
    else grouped.push([l.date, [l]]);
  });

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="h1">출강 일정</h1>
        <button className="btn btn-primary" onClick={() => setEditing({ l: blankLecture(data, view === "cal" ? sel : undefined), isNew: true })}>
          강의의뢰 등록
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        <div className="flex gap-1">
          {(["list", "cal"] as const).map((v) => (
            <button key={v} className={`btn ${view === v ? "btn-primary" : ""}`} aria-pressed={view === v} onClick={() => setView(v)}>
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
        grouped.length ? (
          grouped.map(([date, ls]) => (
            <section key={date} className="grid grid-cols-[52px_minmax(0,1fr)] gap-3">
              <DateTile iso={date} />
              <div className="grid gap-2">
                {ls.map((l) => (
                  <LectureCard key={l.id} data={data} l={l} onEdit={() => setEditing({ l, isNew: false })} />
                ))}
              </div>
            </section>
          ))
        ) : (
          <div className="card text-center text-muted">조건에 맞는 일정이 없습니다.</div>
        )
      ) : (
        <div className="grid gap-2">
          <h2 className="h2">
            {Number(sel.slice(5, 7))}월 {Number(sel.slice(8))}일 출강
          </h2>
          {list.filter((l) => l.date === sel).map((l) => (
            <LectureCard key={l.id} data={data} l={l} onEdit={() => setEditing({ l, isNew: false })} />
          ))}
          {!list.some((l) => l.date === sel) && <div className="card text-center text-muted">이 날은 출강이 없습니다.</div>}
        </div>
      )}

      {editing && (
        <LectureEditor
          key={editing.l.id}
          data={data}
          initial={editing.l}
          isNew={editing.isNew}
          onClose={close}
          onSave={save}
          onDelete={() => {
            update((d) => ({ ...d, lectures: d.lectures.filter((x) => x.id !== editing.l.id) }));
            close();
          }}
        />
      )}
    </div>
  );
}

function DateTile({ iso }: { iso: string }) {
  const [y, m, d] = iso.split("-").map(Number);
  const wd = new Date(y, m - 1, d).getDay();
  const today = iso === todayIso();
  return (
    <div className={`sticky top-2 self-start rounded-lg border py-1.5 text-center ${today ? "border-accent bg-accent text-accent-ink" : "border-line bg-surface"}`}>
      <small className="block text-[11px] opacity-75">{m}월</small>
      <b className="block text-xl leading-tight tabular-nums">{d}</b>
      <span className={`text-xs ${!today && wd === 0 ? "text-bad" : ""}`}>{today ? "오늘" : WEEK[wd]}</span>
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
              className={`flex min-h-16 min-w-0 flex-col gap-0.5 overflow-hidden rounded-md border p-1 text-left ${iso === sel ? "border-accent outline-2 outline-accent" : "border-line"} bg-surface`}
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
