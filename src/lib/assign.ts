import type { AppData, AppNotice, Assignment, AssignSlot, Instructor, Lecture, Unavail } from "./types";
import { uid } from "./store";

// 강사 자동 배정 규칙 (데모). 기준은 아래 두 가지를 임시로 가정한 값이며, 바꿀 수 있게 이 파일에 모아 둡니다.
//  1) 제외일·같은 날 다른 출강이 있으면 후보에서 뺍니다.
//  2) 최근 FAIR_DAYS일 출강 횟수가 적은 순, 같으면 배정 순번(assignOrder) 순.
export const FAIR_DAYS = 60;
export const REMIND_HOURS = 23; // 이 시간까지 응답이 없으면 한 번 더 알림
export const EXPIRE_HOURS = 24; // 이 시간까지 응답이 없으면 배정 취소
const HOUR = 3600_000;
const WEEK = ["일", "월", "화", "수", "목", "금", "토"];

export const nowOf = (d: AppData) => d.simNow ?? new Date().toISOString();

export function unavailText(u: Unavail): string {
  if (u.kind === "date") return u.from ?? "";
  if (u.kind === "range") return `${u.from ?? ""} ~ ${u.to ?? ""}`;
  return `매주 ${WEEK[u.weekday ?? 0]}요일`;
}

export function unavailHit(ins: Instructor, date: string): Unavail | null {
  const wd = new Date(`${date}T00:00:00`).getDay();
  for (const u of ins.unavail ?? []) {
    if (u.kind === "date" && u.from === date) return u;
    if (u.kind === "range" && u.from && u.to && u.from <= date && date <= u.to) return u;
    if (u.kind === "weekday" && u.weekday === wd) return u;
  }
  return null;
}

export interface Candidate {
  ins: Instructor;
  recent: number; // 최근 출강 횟수
  order: number; // 배정 순번 (작을수록 앞)
  out?: string; // 후보에서 빠진 이유
  warn?: string; // 강제 지정할 때 보여 줄 경고
}

function orderIndex(d: AppData, ins: Instructor): number {
  const names = (d.assignOrder ?? "").split(/[,，\n]/).map((x) => x.trim()).filter(Boolean);
  const i = names.indexOf(ins.name);
  return i === -1 ? 999 + d.instructors.indexOf(ins) : i;
}

export function candidatesFor(d: AppData, l: Lecture): Candidate[] {
  const from = new Date(new Date(`${l.date}T00:00:00`).getTime() - FAIR_DAYS * 24 * HOUR).toISOString().slice(0, 10);
  const asg = d.assignments?.find((a) => a.id === l.id);
  return d.instructors.map((ins) => {
    const recent = d.lectures.filter((x) => x.id !== l.id && x.date >= from && x.date < l.date && x.instructorIds.includes(ins.id)).length;
    let out: string | undefined;
    const u = unavailHit(ins, l.date);
    if (l.instructorIds.includes(ins.id)) out = "이미 이 출강에 배정됨";
    else if (u) out = `제외일 (${unavailText(u)}${u.note ? " · " + u.note : ""})`;
    else if (d.lectures.some((x) => x.id !== l.id && x.date === l.date && x.instructorIds.includes(ins.id))) out = "같은 날 다른 출강";
    else if (asg?.slots.some((s) => s.instructorId === ins.id && (s.status === "offered" || s.status === "accepted"))) out = "이미 이 출강에 안내됨";
    return { ins, recent, order: orderIndex(d, ins), out, warn: out };
  });
}

export function ranked(d: AppData, l: Lecture): Candidate[] {
  return candidatesFor(d, l)
    .filter((c) => !c.out)
    .sort((a, b) => a.recent - b.recent || a.order - b.order);
}

const notice = (d: AppData, n: Omit<AppNotice, "id">): AppData => ({ ...d, notices: [{ id: uid("nt"), ...n }, ...(d.notices ?? [])] });
const nameOf = (d: AppData, id: string) => d.instructors.find((i) => i.id === id)?.name ?? "강사";
const lecName = (d: AppData, l: Lecture) => `${l.date.slice(5).replace("-", "/")} ${d.orgs.find((o) => o.id === l.orgId)?.name ?? ""} ${l.target}`;

function putAssignment(d: AppData, a: Assignment): AppData {
  const rest = (d.assignments ?? []).filter((x) => x.id !== a.id);
  return { ...d, assignments: [...rest, a] };
}

function offerTo(d: AppData, l: Lecture, a: Assignment, insId: string, locked: boolean, at: string): [AppData, Assignment] {
  const slot: AssignSlot = { id: uid("sl"), instructorId: insId, locked, status: "offered", offeredAt: at };
  const na: Assignment = { ...a, slots: [...a.slots, slot], tried: a.tried.includes(insId) ? a.tried : [...a.tried, insId] };
  const nd = notice(d, {
    at, to: insId, lectureId: l.id, kind: "offer",
    text: `${nameOf(d, insId)} 강사님께 배정 안내: ${lecName(d, l)} (${EXPIRE_HOURS}시간 안에 수락해 주세요)${locked ? " · 담당자 지정" : ""}`,
  });
  return [nd, na];
}

/** 빈 자리를 후보 순위대로 채워 안내를 보냅니다. 후보가 없으면 담당자에게 알립니다. */
function refill(d: AppData, l: Lecture, a: Assignment, at: string): [AppData, Assignment] {
  let cur = a;
  let data = d;
  for (;;) {
    const active = cur.slots.filter((s) => s.status === "offered" || s.status === "accepted").length;
    if (active >= cur.needed) break;
    const next = ranked(putAssignment(data, cur), l).find((c) => !cur.tried.includes(c.ins.id));
    if (!next) {
      data = notice(data, { at, to: "operator", lectureId: l.id, kind: "operator", text: `${lecName(data, l)}: 안내할 후보가 더 없습니다. 직접 지정해 주세요.` });
      break;
    }
    [data, cur] = offerTo(data, l, cur, next.ins.id, false, at);
  }
  return [data, cur];
}

export interface StartOpts { mode: "auto" | "manual"; needed: number; pinned: string[] }

/** 배정 시작: 강제 지정 강사에게 먼저 안내하고, 남는 자리는 자동으로 채웁니다. */
export function startAssign(d: AppData, lectureId: string, o: StartOpts): AppData {
  const l = d.lectures.find((x) => x.id === lectureId);
  if (!l) return d;
  const at = nowOf(d);
  let a: Assignment = { id: lectureId, mode: o.mode, needed: o.needed, slots: [], tried: [], startedAt: at };
  let data = d;
  for (const id of o.pinned) [data, a] = offerTo(data, l, a, id, true, at);
  if (o.mode === "auto") [data, a] = refill(data, l, a, at);
  return putAssignment(data, a);
}

function syncLecture(d: AppData, lectureId: string, a: Assignment): AppData {
  const ids = a.slots.filter((s) => s.status === "accepted").map((s) => s.instructorId);
  return {
    ...d,
    lectures: d.lectures.map((l) => {
      if (l.id !== lectureId) return l;
      const merged = Array.from(new Set([...l.instructorIds, ...ids]));
      return { ...l, instructorIds: merged, leadId: merged.includes(l.leadId) ? l.leadId : (merged[0] ?? "") };
    }),
  };
}

/** 강사의 응답. 거절은 사유가 있어야 합니다. */
export function respond(d: AppData, lectureId: string, slotId: string, action: "accept" | "decline", reason: string): AppData {
  const l = d.lectures.find((x) => x.id === lectureId);
  const a0 = d.assignments?.find((x) => x.id === lectureId);
  const slot = a0?.slots.find((s) => s.id === slotId);
  if (!l || !a0 || !slot || slot.status !== "offered") return d;
  if (action === "decline" && !reason.trim()) return d;
  const at = nowOf(d);
  const nslot: AssignSlot = action === "accept"
    ? { ...slot, status: "accepted", respondedAt: at }
    : { ...slot, status: "declined", respondedAt: at, reason: reason.trim() };
  let a: Assignment = { ...a0, slots: a0.slots.map((s) => (s.id === slotId ? nslot : s)) };
  let data = notice(d, {
    at, to: "operator", lectureId, kind: action === "accept" ? "accepted" : "declined",
    text: action === "accept"
      ? `${nameOf(d, slot.instructorId)} 강사님이 수락했습니다. 배정 확정 (${lecName(d, l)})`
      : `${nameOf(d, slot.instructorId)} 강사님이 거절했습니다. 사유: ${reason.trim()} (${lecName(d, l)})`,
  });
  if (action === "decline") {
    if (slot.locked) data = notice(data, { at, to: "operator", lectureId, kind: "operator", text: `지정한 강사가 거절했습니다. ${lecName(data, l)}: 자동 배정이면 빈 자리는 순위대로 이어서 안내합니다. 다른 강사를 원하면 직접 지정해 주세요.` });
    else if (a.mode === "auto") [data, a] = refill(data, l, a, at);
  }
  return syncLecture(putAssignment(data, a), lectureId, a);
}

/** 가상 시계를 옮기고, 그 사이 일어났을 재알림·취소·다음 순위 안내를 처리합니다. */
export function advance(d: AppData, hours: number): AppData {
  let data: AppData = { ...d, simNow: new Date(new Date(nowOf(d)).getTime() + hours * HOUR).toISOString() };
  const now = new Date(data.simNow!).getTime();
  for (const a0 of data.assignments ?? []) {
    const l = data.lectures.find((x) => x.id === a0.id);
    if (!l) continue;
    let a = a0;
    for (let guard = 0; guard < 50; guard++) {
      const due = a.slots.find((s) => s.status === "offered" && new Date(s.offeredAt).getTime() + EXPIRE_HOURS * HOUR <= now);
      if (!due) break;
      const at = new Date(new Date(due.offeredAt).getTime() + EXPIRE_HOURS * HOUR).toISOString();
      a = { ...a, slots: a.slots.map((s) => (s.id === due.id ? { ...s, status: "expired" as const, respondedAt: at } : s)) };
      data = notice(data, { at, to: due.instructorId, lectureId: l.id, kind: "expired", text: `${nameOf(data, due.instructorId)} 강사님이 ${EXPIRE_HOURS}시간 안에 응답하지 않아 배정이 취소되었습니다 (${lecName(data, l)})` });
      if (due.locked) data = notice(data, { at, to: "operator", lectureId: l.id, kind: "operator", text: `지정한 강사의 배정이 시간 초과로 취소되었습니다. ${lecName(data, l)}: 빈 자리는 순위대로 이어서 안내합니다. 다른 강사를 원하면 직접 지정해 주세요.` });
      else if (a.mode === "auto") [data, a] = refill(data, l, a, at);
    }
    for (const s of a.slots) {
      if (s.status === "offered" && !s.remindedAt && new Date(s.offeredAt).getTime() + REMIND_HOURS * HOUR <= now) {
        const at = new Date(new Date(s.offeredAt).getTime() + REMIND_HOURS * HOUR).toISOString();
        a = { ...a, slots: a.slots.map((x) => (x.id === s.id ? { ...x, remindedAt: at } : x)) };
        data = notice(data, { at, to: s.instructorId, lectureId: l.id, kind: "reminder", text: `${nameOf(data, s.instructorId)} 강사님께 재알림: ${lecName(data, l)} 배정 수락을 기다리고 있습니다 (1시간 남음)` });
      }
    }
    data = putAssignment(data, a);
  }
  return data;
}

/** 수동 모드: 알림 없이 담당자가 바로 확정 */
export function confirmNow(d: AppData, lectureId: string, insId: string): AppData {
  const l = d.lectures.find((x) => x.id === lectureId);
  if (!l) return d;
  const at = nowOf(d);
  const a0 = d.assignments?.find((x) => x.id === lectureId) ?? { id: lectureId, mode: "manual" as const, needed: 1, slots: [], tried: [], startedAt: at };
  const slot: AssignSlot = { id: uid("sl"), instructorId: insId, locked: true, status: "accepted", offeredAt: at, respondedAt: at };
  const a: Assignment = { ...a0, slots: [...a0.slots, slot], tried: [...a0.tried, insId] };
  const data = notice(d, { at, to: "operator", lectureId, kind: "accepted", text: `담당자가 ${nameOf(d, insId)} 강사님을 바로 확정했습니다 (${lecName(d, l)})` });
  return syncLecture(putAssignment(data, a), lectureId, a);
}

export function resetAssign(d: AppData, lectureId: string): AppData {
  const accepted = (d.assignments?.find((a) => a.id === lectureId)?.slots ?? []).filter((s) => s.status === "accepted").map((s) => s.instructorId);
  return {
    ...d,
    lectures: d.lectures.map((l) => {
      if (l.id !== lectureId) return l;
      const ids = l.instructorIds.filter((x) => !accepted.includes(x));
      return { ...l, instructorIds: ids, leadId: ids.includes(l.leadId) ? l.leadId : (ids[0] ?? "") };
    }),
    assignments: (d.assignments ?? []).filter((a) => a.id !== lectureId),
    notices: (d.notices ?? []).filter((n) => n.lectureId !== lectureId),
  };
}
