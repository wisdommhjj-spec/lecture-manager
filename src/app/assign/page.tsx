"use client";

import { useEffect, useMemo, useState } from "react";
import PageHead from "@/components/PageHead";
import { useStore } from "@/lib/store";
import { dateLabel, orgOf } from "@/lib/package";
import {
  EXPIRE_HOURS, FAIR_DAYS, REMIND_HOURS, advance, candidatesFor, confirmNow, nowOf, ranked, resetAssign, respond, startAssign,
} from "@/lib/assign";
import type { AppData, AppNotice, AssignSlot } from "@/lib/types";

const STATUS: Record<AssignSlot["status"], [string, string]> = {
  offered: ["수락 대기", "chip chip-warn"],
  accepted: ["배정 확정", "chip chip-ok"],
  declined: ["거절", "chip"],
  expired: ["시간 초과 취소", "chip"],
};
const KIND: Record<AppNotice["kind"], string> = {
  offer: "배정 안내", reminder: "재알림", expired: "시간 초과", accepted: "수락", declined: "거절", operator: "담당자 알림",
};

const fmt = (iso: string) => {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

export default function AssignPage() {
  const { data, update } = useStore();
  const [lecId, setLecId] = useState("");
  const [mode, setMode] = useState<"auto" | "manual">("auto");
  const [needed, setNeeded] = useState(2);
  const [pinned, setPinned] = useState<string[]>([]);
  const [declining, setDeclining] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [err, setErr] = useState("");

  const lectures = useMemo(() => (data ? [...data.lectures].sort((a, b) => a.date.localeCompare(b.date)) : []), [data]);
  useEffect(() => {
    if (!data || lecId) return;
    // 강사가 비어 있는 출강을 먼저 고릅니다.
    const open = lectures.find((l) => l.instructorIds.length === 0) ?? lectures[0];
    if (open) setLecId(open.id);
  }, [data, lecId, lectures]);

  if (!data) return <p className="muted">불러오는 중…</p>;
  const lec = data.lectures.find((l) => l.id === lecId);
  const asg = data.assignments?.find((a) => a.id === lecId);
  const now = nowOf(data);
  const run = (fn: (d: AppData) => AppData) => update(fn);
  const nameOf = (id: string) => data.instructors.find((i) => i.id === id)?.name ?? "강사";

  const cands = lec ? candidatesFor(data, lec) : [];
  const order = lec ? ranked(data, lec).map((c) => c.ins.id) : [];
  const shown = [...cands].sort((a, b) => Number(!!a.out) - Number(!!b.out) || order.indexOf(a.ins.id) - order.indexOf(b.ins.id));
  const notices = (data.notices ?? []).filter((n) => n.lectureId === lecId).sort((a, b) => b.at.localeCompare(a.at));
  const accepted = asg?.slots.filter((s) => s.status === "accepted").length ?? 0;

  function start() {
    if (!lec) return;
    setErr("");
    if (pinned.length > needed) return setErr("강제 지정한 강사가 필요 인원보다 많습니다.");
    run((d) => startAssign(d, lec.id, { mode, needed, pinned }));
    setPinned([]);
  }
  function decline(slotId: string) {
    if (!lec) return;
    if (!reason.trim()) return setErr("거절할 때는 사유를 꼭 적어야 합니다.");
    setErr("");
    run((d) => respond(d, lec.id, slotId, "decline", reason));
    setDeclining(null);
    setReason("");
  }
  const clock = (h: number, label: string) => (
    <button key={label} className="btn btn-sm" onClick={() => run((d) => advance(d, h))}>
      {label}
    </button>
  );

  return (
    <div className="grid gap-3">
      <PageHead title="강사 배정" desc="자동 배정과 수동 지정을 섞어 쓰는 반자동 배정 (데모)" />

      <div className="card grid gap-2 border-warn bg-warn-soft text-sm">
        <b>데모 안내</b>
        <p>
          실제 알림은 나가지 않고 아래 “알림 기록”에만 남습니다. 시간은 가상 시계로 빨리 감아 23시간 재알림과 24시간 자동 취소를 확인합니다. 배정 기준(최근 {FAIR_DAYS}일 출강이 적은 순,
          같으면 배정 순번)과 알림 수단은 임시로 정한 가정입니다.
        </p>
      </div>

      <section className="card grid gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="h2">가상 시계</h2>
          <span className="tabular-nums">{fmt(now)}</span>
          {clock(1, "+1시간")}
          {clock(REMIND_HOURS, `+${REMIND_HOURS}시간`)}
          {clock(EXPIRE_HOURS, `+${EXPIRE_HOURS}시간`)}
          <button className="btn btn-sm" onClick={() => run((d) => ({ ...d, simNow: undefined }))}>
            현재 시각으로
          </button>
        </div>
        <p className="text-xs text-muted">
          안내 후 {REMIND_HOURS}시간까지 응답이 없으면 한 번 더 알리고, {EXPIRE_HOURS}시간이 지나면 배정을 취소하고 다음 순위에게 안내합니다.
        </p>
      </section>

      <section className="card grid gap-3">
        <h2 className="h2">1. 출강과 방식</h2>
        <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
          <label className="label">
            출강
            <select className="input" value={lecId} onChange={(e) => { setLecId(e.target.value); setPinned([]); setErr(""); }}>
              {lectures.map((l) => (
                <option key={l.id} value={l.id}>
                  {dateLabel(l.date)} {orgOf(data, l)?.name} {l.target} · 배정 {l.instructorIds.length}명
                </option>
              ))}
            </select>
          </label>
          <label className="label">
            필요 강사 수
            <input className="input" type="number" min={1} max={10} value={needed} onChange={(e) => setNeeded(Math.max(1, Number(e.target.value) || 1))} />
          </label>
          <div className="label">
            배정 방식
            <div className="flex gap-1">
              <button className={`btn ${mode === "auto" ? "btn-primary" : ""}`} onClick={() => setMode("auto")}>자동</button>
              <button className={`btn ${mode === "manual" ? "btn-primary" : ""}`} onClick={() => setMode("manual")}>수동</button>
            </div>
          </div>
        </div>
        <p className="text-sm text-muted">
          {mode === "auto"
            ? "‘고정’으로 지정한 강사에게 먼저 안내하고, 남는 자리는 아래 순위대로 자동으로 안내합니다."
            : "수동: 알림 없이 담당자가 강사를 바로 확정합니다."}
        </p>
      </section>

      {lec && (
        <section className="card grid gap-2">
          <h2 className="h2">2. 후보 순위와 강제 지정</h2>
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>순위</th>
                  <th>강사</th>
                  <th>최근 {FAIR_DAYS}일 출강</th>
                  <th>상태</th>
                  <th>{mode === "auto" ? "고정(강제 지정)" : "확정"}</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((c) => {
                  const rank = order.indexOf(c.ins.id);
                  const on = pinned.includes(c.ins.id);
                  return (
                    <tr key={c.ins.id} className={c.out ? "text-muted" : ""}>
                      <td className="tabular-nums">{c.out ? "-" : rank + 1}</td>
                      <td className="font-bold">{c.ins.name}</td>
                      <td className="tabular-nums">{c.recent}회</td>
                      <td>{c.out ? <span className="chip chip-warn">{c.out}</span> : <span className="chip chip-ok">가능</span>}</td>
                      <td>
                        {mode === "auto" ? (
                          <label className="flex items-center gap-1 text-sm">
                            <input type="checkbox" checked={on} disabled={!!asg} onChange={() => setPinned(on ? pinned.filter((x) => x !== c.ins.id) : [...pinned, c.ins.id])} />
                            고정
                            {c.out && on && <span className="text-xs text-warn">제외일이어도 지정됩니다 (확인 필요)</span>}
                          </label>
                        ) : (
                          <button className="btn btn-sm" onClick={() => run((d) => confirmNow(d, lec.id, c.ins.id))} disabled={!!c.out && c.out.startsWith("이미")}>
                            바로 확정
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {mode === "auto" && (
            <div className="flex flex-wrap items-center gap-2">
              <button className="btn btn-primary" onClick={start} disabled={!!asg}>
                {pinned.length ? `고정 ${pinned.length}명 + 자동 배정 시작` : "자동 배정 시작"}
              </button>
              {asg && <span className="text-sm text-muted">이미 시작했습니다. 처음부터 다시 하려면 아래 ‘이 출강 배정 초기화’를 누르세요.</span>}
            </div>
          )}
          {err && <p className="text-sm text-bad">{err}</p>}
        </section>
      )}

      {asg && lec && (
        <section className="card grid gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="h2">
              3. 진행 상황 <span className="text-sm font-normal text-muted">확정 {accepted} / 필요 {asg.needed}명</span>
            </h2>
            <button className="btn btn-sm" onClick={() => run((d) => resetAssign(d, lec.id))}>
              이 출강 배정 초기화
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>강사</th>
                  <th>상태</th>
                  <th>안내 시각</th>
                  <th>남은 시간</th>
                  <th>강사 입장에서 응답 (시뮬레이션)</th>
                </tr>
              </thead>
              <tbody>
                {asg.slots.map((s) => {
                  const left = Math.max(0, EXPIRE_HOURS * 3600_000 - (new Date(now).getTime() - new Date(s.offeredAt).getTime()));
                  return (
                    <tr key={s.id}>
                      <td className="font-bold">
                        {nameOf(s.instructorId)} {s.locked && <span className="chip">고정</span>}
                      </td>
                      <td>
                        <span className={STATUS[s.status][1]}>{STATUS[s.status][0]}</span>
                        {s.reason && <div className="text-xs text-muted">사유: {s.reason}</div>}
                        {s.remindedAt && s.status === "offered" && <div className="text-xs text-muted">재알림 보냄</div>}
                      </td>
                      <td className="tabular-nums">{fmt(s.offeredAt)}</td>
                      <td className="tabular-nums">{s.status === "offered" ? `${Math.floor(left / 3600_000)}시간 ${Math.floor((left % 3600_000) / 60_000)}분` : "-"}</td>
                      <td>
                        {s.status === "offered" ? (
                          declining === s.id ? (
                            <div className="grid gap-1">
                              <input className="input" placeholder="거절 사유 (필수)" value={reason} onChange={(e) => setReason(e.target.value)} />
                              <div className="flex gap-1">
                                <button className="btn btn-sm" onClick={() => decline(s.id)}>거절 보내기</button>
                                <button className="btn btn-sm" onClick={() => { setDeclining(null); setReason(""); setErr(""); }}>취소</button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex gap-1">
                              <button className="btn btn-sm btn-primary" onClick={() => run((d) => respond(d, lec.id, s.id, "accept", ""))}>수락</button>
                              <button className="btn btn-sm" onClick={() => { setDeclining(s.id); setReason(""); setErr(""); }}>거절</button>
                            </div>
                          )
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {err && <p className="text-sm text-bad">{err}</p>}
          {accepted >= asg.needed && <p className="text-sm text-ok">필요한 강사가 모두 확정되어 이 출강의 강사 목록에 반영했습니다. 서류 패키지와 정산에 바로 이어집니다.</p>}
        </section>
      )}

      {lec && (
        <section className="card grid gap-2">
          <h2 className="h2">알림 기록 <span className="text-sm font-normal text-muted">(데모: 실제로 보내지 않음)</span></h2>
          {notices.length === 0 ? (
            <p className="text-sm text-muted">아직 알림이 없습니다.</p>
          ) : (
            <ul className="grid gap-1 text-sm">
              {notices.map((n) => (
                <li key={n.id} className="flex gap-2">
                  <span className="w-24 shrink-0 tabular-nums text-muted">{fmt(n.at)}</span>
                  <span className="chip shrink-0">{KIND[n.kind]}</span>
                  <span>{n.text}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
