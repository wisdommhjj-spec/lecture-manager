"use client";

import { useState } from "react";
import type { AppData, Lecture } from "@/lib/types";
import { uid } from "@/lib/store";

export function blankLecture(data: AppData, date?: string): Lecture {
  return {
    id: uid("lec"),
    date: date ?? new Date().toISOString().slice(0, 10),
    orgId: data.orgs[0]?.id ?? "",
    target: "",
    subject: data.curricula[0]?.subject ?? "",
    place: "",
    sessions: 2,
    minutesPerSession: 40,
    leadId: "",
    instructorIds: [],
    unitPrice: null,
    account: "corp",
    note: "",
    sendLogs: [],
  };
}

export default function LectureEditor({
  data, initial, isNew, onSave, onDelete, onClose,
}: {
  data: AppData;
  initial: Lecture;
  isNew: boolean;
  onSave: (l: Lecture) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [l, setL] = useState<Lecture>(initial);
  const [err, setErr] = useState("");
  const [invOpen, setInvOpen] = useState(false);
  const set = <K extends keyof Lecture>(k: K, v: Lecture[K]) => setL((x) => ({ ...x, [k]: v }));

  function toggle(id: string) {
    setL((x) => {
      const has = x.instructorIds.includes(id);
      const ids = has ? x.instructorIds.filter((i) => i !== id) : [...x.instructorIds, id];
      const leadId = ids.includes(x.leadId) ? x.leadId : (ids[0] ?? "");
      const personalAccountId = x.personalAccountId && ids.includes(x.personalAccountId) ? x.personalAccountId : undefined;
      const units = { ...(x.units ?? {}) };
      if (has) delete units[id];
      return { ...x, instructorIds: ids, leadId, personalAccountId, units };
    });
  }

  function save() {
    if (!l.date || !l.orgId) return setErr("날짜와 기관은 꼭 입력해 주세요.");
    const org = data.orgs.find((o) => o.id === l.orgId);
    onSave({ ...l, place: l.place || `${org?.name.replace("등학교", "") ?? ""} 각 교실` });
  }

  const picked = data.instructors.filter((i) => l.instructorIds.includes(i.id));

  return (
    <div className="fixed inset-0 z-10 flex justify-center overflow-auto bg-black/50 p-4" onClick={onClose}>
      <div className="card my-auto h-fit w-full max-w-2xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="강의의뢰 등록">
        <h2 className="h2 mb-3">{isNew ? "강의의뢰 등록" : "출강 일정 수정"}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="label">
            출강일
            <input className="input" type="date" value={l.date} onChange={(e) => set("date", e.target.value)} />
          </label>
          <label className="label">
            기관
            <select className="input" value={l.orgId} onChange={(e) => set("orgId", e.target.value)}>
              {data.orgs.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>
          <label className="label">
            지역·구
            <input
              className="input"
              placeholder={data.orgs.find((o) => o.id === l.orgId)?.area || "예: 고양시 덕양구"}
              value={l.area ?? ""}
              onChange={(e) => set("area", e.target.value)}
            />
          </label>
          <label className="label">
            사업·의뢰처
            <input className="input" placeholder="예: 교육청 사업, 학교 직접 의뢰" value={l.source ?? ""} onChange={(e) => set("source", e.target.value)} />
          </label>
          <label className="label">
            과목
            <select className="input" value={l.subject} onChange={(e) => set("subject", e.target.value)}>
              {Array.from(new Set(data.curricula.map((c) => c.subject))).map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="label">
            대상
            <input className="input" placeholder="예: 3학년" value={l.target} onChange={(e) => set("target", e.target.value)} />
          </label>
          <label className="label">
            장소
            <input className="input" placeholder="비워 두면 '기관명 각 교실'" value={l.place} onChange={(e) => set("place", e.target.value)} />
          </label>
          <label className="label">
            교시·시간
            <input className="input" placeholder="예: 3~4교시 (10:00~11:20)" value={l.period ?? ""} onChange={(e) => set("period", e.target.value)} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="label">
              차시
              <input className="input" type="number" min={1} max={8} value={l.sessions} onChange={(e) => set("sessions", Math.max(1, Number(e.target.value) || 1))} />
            </label>
            <label className="label">
              1차시(분)
              <input className="input" type="number" min={10} step={5} value={l.minutesPerSession} onChange={(e) => set("minutesPerSession", Number(e.target.value) || 40)} />
            </label>
          </div>
          <label className="label">
            강사 1인 1차시 단가(원)
            <input
              className="input"
              type="number"
              step={1000}
              placeholder="미정이면 비워 두세요"
              value={l.unitPrice ?? ""}
              onChange={(e) => set("unitPrice", e.target.value === "" ? null : Number(e.target.value))}
            />
          </label>
          <label className="label">
            입금 계좌
            <select
              className="input"
              value={l.account}
              onChange={(e) => setL((x) => ({ ...x, account: e.target.value as Lecture["account"], personalAccountId: undefined }))}
            >
              <option value="corp">법인계좌 (기본)</option>
              <option value="personal">강사 개인계좌 (기관 요청 시)</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-ink sm:col-span-2">
            <input type="checkbox" checked={!!l.noDonation} onChange={(e) => set("noDonation", e.target.checked || undefined)} />
            후원금 제외 (단가가 낮아 이 출강은 후원금을 받지 않습니다)
          </label>
          <div className="label sm:col-span-2">
            강사 배정 ({picked.length}명) · 누르면 선택/해제
            <div className="flex flex-wrap gap-1.5">
              {data.instructors.map((i) => {
                const on = l.instructorIds.includes(i.id);
                return (
                  <button
                    key={i.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(i.id)}
                    className={`rounded-full border px-2.5 py-0.5 text-sm ${on ? "border-accent bg-accent font-bold text-accent-ink" : "border-line bg-bg text-ink"}`}
                  >
                    {i.name}
                  </button>
                );
              })}
            </div>
          </div>
          {picked.length > 0 && (
            <div className="label sm:col-span-2">
              강사별 차시 (강의 전체는 {l.sessions}차시 · 다르게 맡는 강사만 바꾸세요)
              <div className="flex flex-wrap gap-2">
                {picked.map((i) => {
                  const n = l.units?.[i.id] ?? l.sessions;
                  return (
                    <label key={i.id} className={`flex items-center gap-1.5 rounded border px-2 py-1 text-sm ${n !== l.sessions ? "border-accent bg-accent-soft" : "border-line bg-bg"}`}>
                      <span className="text-ink">{i.name}</span>
                      <input
                        className="input w-14 py-0.5 text-right"
                        type="number"
                        min={0}
                        max={8}
                        aria-label={`${i.name} 차시`}
                        value={n}
                        onChange={(e) => {
                          const v = Math.max(0, Number(e.target.value) || 0);
                          setL((x) => {
                            const units = { ...(x.units ?? {}) };
                            if (v === x.sessions) delete units[i.id];
                            else units[i.id] = v;
                            return { ...x, units };
                          });
                        }}
                      />
                      <span className="text-muted">차시</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
          {picked.length > 0 && (
            <label className="label">
              대표 강사
              <select className="input" value={l.leadId} onChange={(e) => set("leadId", e.target.value)}>
                {picked.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {l.account === "personal" && (
            <label className="label">
              개인계좌로 받을 강사
              <select className="input" value={l.personalAccountId ?? ""} onChange={(e) => set("personalAccountId", e.target.value || undefined)}>
                <option value="">선택하세요</option>
                {picked.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="label sm:col-span-2">
            메모
            <textarea className="input" rows={2} value={l.note} onChange={(e) => set("note", e.target.value)} />
          </label>
        </div>
        <p className="mt-2 min-h-5 text-sm text-bad">{err}</p>
        {!isNew && (
          <div className="mt-1 flex flex-wrap items-center gap-2 rounded border border-line bg-bg px-3 py-2 text-sm">
            <button type="button" className="btn btn-sm" onClick={() => setInvOpen((v) => !v)} aria-expanded={invOpen}>
              계산서 발행
            </button>
            <span className="text-muted">
              {l.invoiceDate ? `발행일 ${l.invoiceDate}` : "아직 발행 전"}
              {l.depositDate ? ` · 입금일 ${l.depositDate}` : ""}
            </span>
            {invOpen && (
              <span className="flex w-full flex-wrap items-center gap-2">
                <label className="flex items-center gap-1">
                  발행일
                  <input className="input w-40 py-1" type="date" value={l.invoiceDate ?? ""} onChange={(e) => set("invoiceDate", e.target.value || undefined)} />
                </label>
                <button type="button" className="btn btn-sm" onClick={() => set("invoiceDate", new Date().toISOString().slice(0, 10))}>
                  오늘
                </button>
                {l.invoiceDate && (
                  <button type="button" className="btn btn-sm text-bad" onClick={() => set("invoiceDate", undefined)}>
                    지우기
                  </button>
                )}
                <span className="text-xs text-muted">저장을 눌러야 반영됩니다. 입금일은 정산관리에서 기록합니다.</span>
              </span>
            )}
          </div>
        )}
        <div className="mt-2 flex flex-wrap justify-between gap-2">
          <div>
            {!isNew && (
              <button
                className="btn text-bad"
                onClick={() => {
                  if (confirm("이 일정을 삭제할까요?")) onDelete();
                }}
              >
                삭제
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button className="btn" onClick={onClose}>
              취소
            </button>
            <button className="btn btn-primary" onClick={save}>
              저장
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
