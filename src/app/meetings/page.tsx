"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { addDays, agendaHtml, scheduleHtml } from "@/lib/print";
import type { Meeting } from "@/lib/types";
import PageHead from "@/components/PageHead";
import PrintPreview from "@/components/PrintPreview";

const today = () => new Date().toISOString().slice(0, 10);
const LATER = [
  ["업무 할 일", "서류 발송, 정산, 강사 연락 같은 할 일을 담당자별로 나눠 관리합니다."],
  ["강의 활동 보고서", "강사가 출강 후 강의 내용과 활동 사진을 올리고, 기관별로 모아 봅니다."],
];

export default function Meetings() {
  const { data, update } = useStore();
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(() => addDays(today(), 13));
  const [fee, setFee] = useState(true);
  const [showSched, setShowSched] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const [draft, setDraft] = useState<Meeting | null>(null);
  const [showAgenda, setShowAgenda] = useState(false);
  const [msg, setMsg] = useState("");
  if (!data) return <p className="muted">불러오는 중…</p>;

  const list = [...(data.meetings ?? [])].sort((a, b) => b.date.localeCompare(a.date));
  const blank = (): Meeting => ({
    id: "", date: today(), time: list[0]?.time ?? "", guide: data.meetingGuide ?? "",
    agenda: [{ title: "", body: "" }], notes: "",
  });
  const pick = (id: string) => {
    setSel(id);
    setMsg("");
    setShowAgenda(false);
    setDraft(id === "new" ? blank() : structuredClone(list.find((m) => m.id === id) ?? null));
  };
  const setD = (p: Partial<Meeting>) => setDraft((d) => (d ? { ...d, ...p } : d));
  const setItem = (i: number, p: Partial<Meeting["agenda"][number]>) =>
    setDraft((d) => (d ? { ...d, agenda: d.agenda.map((a, j) => (j === i ? { ...a, ...p } : a)) } : d));

  function save() {
    if (!draft || !draft.date) return setMsg("회의 날짜를 선택해 주세요.");
    const m: Meeting = { ...draft, id: draft.date };
    update((d) => ({
      ...d,
      // 날짜를 바꿔 저장하면 이전 날짜 회의는 그대로 두고 새 날짜로 하나 더 만듭니다.
      meetings: [...(d.meetings ?? []).filter((x) => x.id !== m.id), m],
      meetingGuide: m.guide,
    }));
    setSel(m.id);
    setDraft(m);
    setMsg("저장했습니다.");
  }
  function remove() {
    if (!draft || !confirm("이 회의 안건을 삭제할까요?")) return;
    update((d) => ({ ...d, meetings: (d.meetings ?? []).filter((x) => x.id !== draft.id) }));
    setSel(null);
    setDraft(null);
  }

  return (
    <div className="grid gap-4">
      <PageHead title="회의록·업무" desc="정기회의 때 나눠 줄 출강 일정과 안건을 만들고, 미리 본 뒤 인쇄(PDF 저장)합니다." />

      <section className="card grid gap-3">
        <h2 className="h2">출강 일정 출력</h2>
        <div className="grid gap-3 sm:grid-cols-4">
          <label className="label">
            시작일
            <input className="input" type="date" value={from} onChange={(e) => e.target.value && setFrom(e.target.value)} />
          </label>
          <label className="label">
            종료일
            <input className="input" type="date" value={to} onChange={(e) => e.target.value && setTo(e.target.value)} />
          </label>
          <label className="label">
            강사비
            <span className="flex h-9 items-center gap-2 text-sm text-ink">
              <input type="checkbox" checked={fee} onChange={(e) => setFee(e.target.checked)} /> 일정표에 강사비 넣기
            </span>
          </label>
          <div className="flex items-end">
            <button className="btn btn-primary w-full" onClick={() => setShowSched((v) => !v)}>
              {showSched ? "미리보기 닫기" : "미리보기"}
            </button>
          </div>
        </div>
        <label className="label">
          강사 배정 순번 (쉼표로 구분, 일정표와 안건지 위에 표시됩니다)
          <input className="input" value={data.assignOrder ?? ""} onChange={(e) => update((d) => ({ ...d, assignOrder: e.target.value }))} />
        </label>
        {showSched && <PrintPreview html={scheduleHtml(data, from, to, fee)} />}
      </section>

      <section className="card grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="h2">정기회의 안건</h2>
          <div className="flex flex-wrap items-center gap-2">
            <select className="input w-auto" value={sel ?? ""} onChange={(e) => e.target.value && pick(e.target.value)} aria-label="저장된 회의">
              <option value="">저장된 회의 고르기 ({list.length})</option>
              {list.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.date}
                </option>
              ))}
            </select>
            <button className="btn" onClick={() => pick("new")}>
              새 회의
            </button>
          </div>
        </div>
        {!draft && <p className="muted">저장된 회의를 고르거나 새 회의를 만드세요. 한 번 저장한 안건은 날짜별로 계속 쌓입니다.</p>}
        {draft && (
          <div className="grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="label">
                회의 날짜
                <input className="input" type="date" value={draft.date} onChange={(e) => setD({ date: e.target.value })} />
              </label>
              <label className="label">
                시간
                <input className="input" placeholder="예: 10:00" value={draft.time} onChange={(e) => setD({ time: e.target.value })} />
              </label>
            </div>
            <label className="label">
              모임 안내 (비워 두면 인쇄물에 나오지 않습니다)
              <input className="input" value={draft.guide} onChange={(e) => setD({ guide: e.target.value })} />
            </label>
            {draft.agenda.map((a, i) => (
              <div key={i} className="grid gap-2 rounded border border-line p-3">
                <div className="flex gap-2">
                  <input className="input font-semibold" placeholder={`안건 ${i + 1} 제목`} value={a.title} onChange={(e) => setItem(i, { title: e.target.value })} />
                  <button className="btn btn-sm text-bad" onClick={() => setD({ agenda: draft.agenda.filter((_, j) => j !== i) })}>
                    삭제
                  </button>
                </div>
                <textarea className="input" rows={4} placeholder="내용 (줄바꿈은 그대로 인쇄됩니다)" value={a.body} onChange={(e) => setItem(i, { body: e.target.value })} />
              </div>
            ))}
            <div>
              <button className="btn btn-sm" onClick={() => setD({ agenda: [...draft.agenda, { title: "", body: "" }] })}>
                + 안건 추가
              </button>
            </div>
            <label className="label">
              메모
              <textarea className="input" rows={2} value={draft.notes} onChange={(e) => setD({ notes: e.target.value })} />
            </label>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm text-ok">{msg}</span>
              <div className="flex gap-2">
                {sel !== "new" && (
                  <button className="btn text-bad" onClick={remove}>
                    삭제
                  </button>
                )}
                <button className="btn" onClick={() => setShowAgenda((v) => !v)}>
                  {showAgenda ? "미리보기 닫기" : "미리보기"}
                </button>
                <button className="btn btn-primary" onClick={save}>
                  저장
                </button>
              </div>
            </div>
            {showAgenda && <PrintPreview html={agendaHtml(data, { ...draft, id: draft.date })} />}
          </div>
        )}
      </section>

      <div className="grid gap-3 md:grid-cols-2">
        {LATER.map(([t, d]) => (
          <div key={t} className="card">
            <div className="flex items-center justify-between">
              <b>{t}</b>
              <span className="chip">준비 중</span>
            </div>
            <p className="mt-1 text-sm text-muted">{d}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
