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

export const DEFAULT_DONATION_RATE = 20;

/** 이 강사가 맡은 차시 수 (따로 정하지 않았으면 강의 전체 차시) */
export function unitsOf(l: Lecture, insId: string) {
  return l.units?.[insId] ?? l.sessions;
}

/** 배정 강사 전원의 차시 합 (견적서 수량) */
export function totalUnits(l: Lecture) {
  return l.instructorIds.reduce((s, id) => s + unitsOf(l, id), 0);
}

/** 강사 1인 강사료 = 1차시 단가 × 그 강사의 차시 수 */
export function feeOf(l: Lecture, insId: string) {
  return l.unitPrice == null ? null : l.unitPrice * unitsOf(l, insId);
}

/** 강사료 합계 = 배정 강사 각자의 강사료 합 */
export function feeTotal(l: Lecture) {
  return l.unitPrice == null ? null : l.unitPrice * totalUnits(l);
}

/** 후원금 = 강사료 × 비율, 반올림 */
export function donationOf(fee: number, ratePct: number) {
  return Math.round((fee * ratePct) / 100);
}

export const DEFAULT_WITHHOLDING = { on: true, rate: 3.3 };
export const withholdingCfg = (data: AppData) => data.settings.withholding ?? DEFAULT_WITHHOLDING;

/**
 * 원천징수(사업소득 3.3% = 소득세 3% + 지방소득세 0.3%).
 * 소득세는 원 미만 절사, 지방소득세는 소득세의 10%를 10원 미만 절사로 계산합니다.
 */
export function withholdingOf(fee: number, ratePct: number) {
  const income = Math.floor((fee * ratePct) / 110 + 1e-9); // 3.3% → 소득세율 3%
  const local = Math.floor((income * 0.1) / 10) * 10;
  return income + local;
}

/**
 * 강사 한 명의 한 출강 정산.
 * - 후원금: 강사료 × 비율 (출강에 '후원금 제외'를 켜면 0)
 * - 원천징수: 법인계좌로 조합이 강사에게 지급할 때만 강사료에서 제외 (개인계좌는 기관이 직접 지급하므로 계산하지 않음)
 * - net: 법인계좌면 강사에게 지급할 금액, 개인계좌면 강사가 보유하는 금액
 */
export function payCalc(data: AppData, l: Lecture, insId: string) {
  const fee = feeOf(l, insId);
  if (fee == null) return { fee: null, don: null, tax: null, net: null };
  const don = l.noDonation ? 0 : donationOf(fee, donationRateOf(data));
  const w = withholdingCfg(data);
  const tax = l.account === "corp" && w.on ? withholdingOf(fee, w.rate) : 0;
  return { fee, don, tax, net: fee - don - tax };
}

export const donationRateOf = (data: AppData) => data.settings.donationRate ?? DEFAULT_DONATION_RATE;

export type SettleStatus = "nopay" | "pre" | "wait" | "paid";
export const SETTLE_LABEL: Record<SettleStatus, string> = {
  nopay: "단가 미정",
  pre: "계산서 발행 전",
  wait: "입금 대기",
  paid: "입금 완료",
};
export function settleStatus(l: Lecture): SettleStatus {
  if (l.unitPrice == null) return "nopay";
  if (l.depositDate) return "paid";
  return l.invoiceDate ? "wait" : "pre";
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

export type DocStatus = { kind: "sent" | "ready" | "check"; label: string; note?: string; at?: string };

/** 목록에 보여 줄 서류 상태: 발송완료 / 미발송(바로 보낼 수 있음) / 확인필요(경고 있음) */
export function docStatus(data: AppData, l: Lecture): DocStatus {
  const last = l.sendLogs.at(-1);
  if (last) return { kind: "sent", label: last.testMode ? "발송완료(테스트)" : "발송완료", at: last.at };
  const w = checkPackage(data, l, buildLessonPlan(data, l), orgOf(data, l)?.contactEmail ?? "");
  if (w.length) return { kind: "check", label: "확인필요", note: w[0].text.replace(/\.$/, "") + (w.length > 1 ? ` 외 ${w.length - 1}건` : "") };
  return { kind: "ready", label: "미발송" };
}

export function shortInstructors(data: AppData, l: Lecture) {
  const lead = leadOf(data, l);
  const n = l.instructorIds.length;
  if (!n) return "미배정";
  return `${lead?.name ?? instructorsOf(data, l)[0]?.name ?? ""}${n > 1 ? ` 외 ${n - 1}` : ""}`;
}
