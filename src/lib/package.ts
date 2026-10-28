import type { AppData, Instructor, Lecture, LessonPlan, Org, StoredFile } from "./types";

export const won = (n: number | null | undefined) =>
  n == null ? "-" : `${Math.round(n).toLocaleString("ko-KR")}원`;

export const WEEK = ["일", "월", "화", "수", "목", "금", "토"];

export function dateLabel(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const wd = WEEK[new Date(y, m - 1, d).getDay()];
  return `${y}. ${m}. ${d}.(${wd})`;
}

export function orgOf(data: AppData, l: Lecture): Org | undefined {
  return data.orgs.find((o) => o.id === l.orgId);
}

export function instructorsOf(data: AppData, l: Lecture): Instructor[] {
  return l.instructorIds
    .map((id) => data.instructors.find((i) => i.id === id))
    .filter((i): i is Instructor => !!i);
}

export function leadOf(data: AppData, l: Lecture) {
  return data.instructors.find((i) => i.id === l.leadId);
}

/** 강사료 합계 = 1인 1차시 단가 × 차시 × 투입 인원 */
export function feeTotal(l: Lecture) {
  return l.unitPrice == null ? null : l.unitPrice * l.sessions * l.instructorIds.length;
}

/** 파일 이름에 쓸 수 없는 문자를 지웁니다. */
const safe = (s: string) => s.replace(/[\\/:*?"<>|]/g, "").trim();

/** 규칙: yyyy.mm_기관명.zip (월은 출강일 기준) */
export function zipNameOf(l: Lecture, org?: Org) {
  return `${l.date.slice(0, 4)}.${l.date.slice(5, 7)}_${safe(org?.name ?? "기관미정")}.zip`;
}

export function schoolYear(iso: string) {
  // 학년도는 3월에 시작합니다. 1~2월 출강은 전년도 학년도로 봅니다.
  const y = Number(iso.slice(0, 4));
  return `${Number(iso.slice(5, 7)) < 3 ? y - 1 : y}학년도`;
}

export function buildLessonPlan(data: AppData, l: Lecture): LessonPlan {
  const cur = data.curricula.find((c) => c.subject === l.subject);
  const lead = leadOf(data, l);
  const others = l.instructorIds.length - 1;
  const sessions = Array.from({ length: l.sessions }, (_, i) => {
    const base = cur?.sessions[i] ?? { topics: [{ theme: "", content: "", remark: "" }], effects: "" };
    return {
      label: `${i + 1}차\n(${l.minutesPerSession}분)`,
      topics: base.topics.map((t) => ({ ...t })),
      effects: base.effects,
    };
  });
  return {
    schoolYear: schoolYear(l.date),
    subject: l.subject,
    place: l.place,
    instructorsText: lead ? `${lead.name}${others > 0 ? ` 외 ${others}인` : ""}` : "",
    target: l.target,
    leadPhone: lead?.phone ?? "",
    totalTime: `${l.sessions * l.minutesPerSession}분`,
    purpose: cur?.purpose ?? "",
    sessions,
  };
}

export interface PackageFile {
  kind: "card" | "quote" | "bizreg" | "account" | "plan";
  label: string;
  fileName: string;
  ready: boolean;
  source?: StoredFile; // 올려 둔 파일(사업자등록증, 통장사본)
}

export function accountCopyOf(data: AppData, l: Lecture): { file?: StoredFile; owner: string } {
  if (l.account === "personal") {
    const ins = data.instructors.find((i) => i.id === l.personalAccountId);
    return { file: ins?.accountCopy, owner: ins ? `${ins.name} 강사 개인계좌` : "개인계좌(강사 미선택)" };
  }
  return { file: data.settings.corpAccountCopy, owner: "법인계좌" };
}

const extOf = (f?: StoredFile) => (f ? (f.name.match(/\.[a-z0-9]+$/i)?.[0] ?? "") : "");

export function packageFiles(data: AppData, l: Lecture): PackageFile[] {
  const org = orgOf(data, l);
  const n = l.instructorIds.length;
  const acct = accountCopyOf(data, l);
  const biz = data.settings.businessRegistration;
  const orgName = safe(org?.name ?? "기관");
  return [
    { kind: "card", label: `강사카드 (${n}명)`, fileName: `01_강사카드_${orgName}.docx`, ready: n > 0 },
    { kind: "quote", label: "견적서", fileName: `02_견적서_${orgName}.docx`, ready: l.unitPrice != null },
    { kind: "bizreg", label: "사업자등록증", fileName: `03_사업자등록증${extOf(biz)}`, ready: !!biz, source: biz },
    {
      kind: "account",
      label: `계좌사본 (${acct.owner})`,
      fileName: `04_계좌사본${extOf(acct.file)}`,
      ready: !!acct.file,
      source: acct.file,
    },
    { kind: "plan", label: "강의계획서", fileName: `05_강의계획서_${orgName}.docx`, ready: true },
  ];
}

export interface Warning {
  text: string;
  fixHref?: string;
}

/** 수락 전에 막아야 할 문제들. 하나라도 있으면 '수락하고 보내기'를 막습니다. */
export function checkPackage(data: AppData, l: Lecture, plan: LessonPlan, to: string): Warning[] {
  const w: Warning[] = [];
  const org = orgOf(data, l);
  if (!org) w.push({ text: "기관이 지정되지 않았습니다.", fixHref: `/schedule?edit=${l.id}` });
  if (!l.instructorIds.length) w.push({ text: "배정된 강사가 없습니다.", fixHref: `/schedule?edit=${l.id}` });
  if (l.unitPrice == null) w.push({ text: "견적 단가가 입력되지 않았습니다.", fixHref: `/schedule?edit=${l.id}` });
  if (!data.settings.businessRegistration) w.push({ text: "사업자등록증 파일이 보관함에 없습니다.", fixHref: "/vault" });
  if (l.account === "personal") {
    const ins = data.instructors.find((i) => i.id === l.personalAccountId);
    if (!ins) w.push({ text: "개인계좌를 요청했지만 어느 강사의 계좌인지 정하지 않았습니다.", fixHref: `/schedule?edit=${l.id}` });
    else if (!ins.accountCopy) w.push({ text: `${ins.name} 강사의 개인 통장사본이 없습니다.`, fixHref: "/vault" });
  } else if (!data.settings.corpAccountCopy) {
    w.push({ text: "법인 통장사본 파일이 보관함에 없습니다.", fixHref: "/vault" });
  }
  instructorsOf(data, l).forEach((i) => {
    if (!i.phone || !i.name) w.push({ text: `강사 정보가 비어 있습니다: ${i.name || i.id}`, fixHref: "/instructors" });
  });
  if (!plan.purpose.trim()) w.push({ text: "강의계획서의 교육 목적이 비어 있습니다." });
  if (plan.sessions.some((s) => s.topics.every((t) => !t.content.trim())))
    w.push({ text: "강의계획서에 교육내용이 빈 차시가 있습니다." });
  if (!to.trim()) w.push({ text: "받는 사람(기관 담당자) 이메일이 없습니다.", fixHref: "/orgs" });
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to.trim())) w.push({ text: `받는 사람 이메일 형식이 이상합니다: ${to}` });
  return w;
}

export function fillTemplate(tpl: string, data: AppData, l: Lecture, files: string[]) {
  const org = orgOf(data, l);
  const map: Record<string, string> = {
    기관명: org?.name ?? "",
    담당자: org?.contactName || "담당 선생",
    강의일: dateLabel(l.date),
    강의월: `${Number(l.date.slice(5, 7))}월`,
    대상: l.target,
    과목명: l.subject,
    파일목록: files.join(", "),
  };
  return tpl.replace(/\{(.+?)\}/g, (m, k) => (k in map ? map[k] : m));
}
