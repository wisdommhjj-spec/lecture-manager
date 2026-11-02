import type { AppData, Lecture } from "./types";
import { SETTLE_LABEL, donationOf, donationRateOf, feeOf, orgOf, settleStatus, won } from "./package";
import { esc } from "./print";

/** 강사 한 명의 월말 강의료 명세서 (바움출강관리와 같은 구성) */

const md = (iso: string) => `${Number(iso.slice(5, 7))}.${Number(iso.slice(8, 10))}`;

export interface StmtRow {
  l: Lecture;
  fee: number | null;
  don: number | null;
  net: number | null;
}

/** 이 달에 강사가 배정된 출강을 계좌 구분(법인/개인)별로 모읍니다. */
export function stmtCalc(data: AppData, insId: string, month: string) {
  const rate = donationRateOf(data);
  const g = { corp: [] as StmtRow[], personal: [] as StmtRow[] };
  data.lectures
    .filter((l) => l.date.startsWith(month) && l.instructorIds.includes(insId))
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach((l) => {
      const fee = feeOf(l, insId);
      const don = fee == null ? null : donationOf(fee, rate);
      g[l.account].push({ l, fee, don, net: fee == null || don == null ? null : fee - don });
    });
  return g;
}

export function monthInstructorIds(data: AppData, month: string) {
  const s = new Set<string>();
  data.lectures.filter((l) => l.date.startsWith(month)).forEach((l) => l.instructorIds.forEach((id) => s.add(id)));
  return [...s].sort((a, b) =>
    (data.instructors.find((i) => i.id === a)?.name ?? "").localeCompare(data.instructors.find((i) => i.id === b)?.name ?? "", "ko"),
  );
}

const CSS = `
@page { size: A4 portrait; margin: 12mm; }
* { box-sizing: border-box; }
body { margin: 0; background: #fff; color: #14231f; font: 13px/1.5 "Pretendard","Apple SD Gothic Neo","Malgun Gothic",sans-serif; }
.stm { padding: 6px 4px; page-break-after: always; }
.stm:last-child { page-break-after: auto; }
.h { display: flex; justify-content: space-between; gap: 16px; border-bottom: 2px solid #1b6a56; padding-bottom: 10px; }
.t { font-size: 22px; font-weight: 700; color: #1b6a56; } .s { font-size: 13px; color: #4c625c; margin-top: 2px; }
.i { text-align: right; font-size: 12px; color: #4c625c; }
.nm { margin: 14px 0 10px; font-size: 15px; }
table { width: 100%; border-collapse: collapse; margin: 0 0 6px; }
th, td { border-bottom: 1px solid #d6e2de; padding: 6px 7px; text-align: left; font-size: 12.5px; vertical-align: top; }
th { background: #eef5f2; color: #3b524c; font-weight: 600; }
.n { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
h3 { font-size: 14px; margin: 18px 0 2px; color: #1b6a56; } .d { font-size: 12px; color: #4c625c; margin: 0 0 6px; }
tfoot td { font-weight: 700; background: #f6faf8; }
tr { break-inside: avoid; }
.box { border: 1px solid #1b6a56; border-radius: 6px; padding: 10px 12px; margin-top: 14px; background: #f2faf6; }
.box div { display: flex; justify-content: space-between; gap: 12px; padding: 2px 0; }
.fn { font-size: 11.5px; color: #4c625c; margin-top: 12px; } small { color: #5d7570; }
`;

function body(data: AppData, insId: string, month: string) {
  const name = data.instructors.find((i) => i.id === insId)?.name ?? insId;
  const rate = donationRateOf(data);
  const g = stmtCalc(data, insId, month);
  const all = [...g.corp, ...g.personal];
  const sum = (a: StmtRow[], k: "fee" | "don" | "net") => a.reduce((s, e) => s + (e[k] ?? 0), 0);
  const unk = all.filter((e) => e.fee == null).length;
  const ym = `${month.slice(0, 4)}년 ${Number(month.slice(5))}월`;
  const today = new Date().toISOString().slice(0, 10);

  const status = (kind: "corp" | "personal", e: StmtRow) => {
    const d = (kind === "corp" ? e.l.payouts : e.l.donations)?.[insId];
    if (d) return `${kind === "corp" ? "지급" : "납부"} ${md(d)}`;
    return e.l.depositDate ? (kind === "corp" ? "지급 예정" : "납부 필요") : "입금 대기";
  };
  const table = (kind: "corp" | "personal", title: string, desc: string, list: StmtRow[]) => {
    if (!list.length) return "";
    const col = kind === "corp" ? "지급액" : "본인 보유액";
    const rows = list
      .map(
        (e) =>
          `<tr><td>${md(e.l.date)}</td><td>${esc(orgOf(data, e.l)?.name ?? "")}<br><small>${esc(e.l.target)} · ${e.l.sessions}차시</small></td><td>${e.l.leadId === insId ? "팀장" : "강사"}</td><td class="n">${e.fee == null ? "단가 미정" : won(e.fee)}</td><td class="n">${e.don == null ? "-" : won(e.don)}</td><td class="n">${e.net == null ? "-" : won(e.net)}</td><td>${esc(status(kind, e))}</td></tr>`,
      )
      .join("");
    return `<h3>${esc(title)}</h3><p class="d">${esc(desc)}</p><table><thead><tr><th>출강일</th><th>기관</th><th>역할</th><th class="n">강사료</th><th class="n">후원금</th><th class="n">${col}</th><th>처리</th></tr></thead><tbody>${rows}</tbody><tfoot><tr><td colspan="3">소계 ${list.length}건</td><td class="n">${won(sum(list, "fee"))}</td><td class="n">${won(sum(list, "don"))}</td><td class="n">${won(sum(list, "net"))}</td><td></td></tr></tfoot></table>`;
  };

  return `<div class="stm"><div class="h"><div><div class="t">강의료 명세서</div><div class="s">${esc(ym)} 출강분</div></div><div class="i">${esc(data.settings.company.name)}<br>작성일 ${today}</div></div>
<div class="nm"><b>${esc(name)}</b> 강사님</div>
<table><tbody><tr><th>출강 건수</th><td class="n">${all.length}건</td><th>강사료 합계</th><td class="n">${won(sum(all, "fee"))}</td></tr>
<tr><th>후원금 (${rate}%)</th><td class="n">${won(sum(all, "don"))}</td><th>후원금 공제 후 금액</th><td class="n">${won(sum(all, "net"))}</td></tr></tbody></table>
${table("corp", "법인계좌 입금분", "바움이 입금을 받아 후원금을 뺀 금액을 지급합니다.", g.corp)}
${table("personal", "개인계좌 입금분", "강사님 계좌로 입금된 건입니다. 후원금은 직접 납부해 주세요.", g.personal)}
${all.length ? "" : '<p class="d">이 달에 배정된 출강이 없습니다.</p>'}
<div class="box"><div><span>바움에서 지급받으실 금액 (법인계좌분)</span><b>${won(sum(g.corp, "net"))}</b></div><div><span>직접 납부하실 후원금 (개인계좌분)</span><b>${won(sum(g.personal, "don"))}</b></div></div>
<div class="fn">${unk ? `단가가 정해지지 않은 ${unk}건은 금액에 포함하지 않았습니다. ` : ""}금액은 원 단위이며, 후원금은 강사료의 ${rate}%입니다.</div></div>`;
}

/** 강사 한 명 또는 여러 명(전체)의 명세서를 한 문서로 만듭니다. */
export function statementHtml(data: AppData, insIds: string[], month: string) {
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>강의료 명세서 ${esc(month)}</title><style>${CSS}</style></head><body>${insIds.map((id) => body(data, id, month)).join("")}</body></html>`;
}

export { SETTLE_LABEL, settleStatus };
