import type { AppData, Meeting } from "./types";
import { dateLabel, feeTotal, instructorsOf, orgOf, totalUnits, unitsOf, won } from "./package";

/** 회의용 인쇄물(A4 세로)을 HTML 문자열로 만듭니다. 미리보기와 인쇄(PDF 저장)에 같이 씁니다. */

export const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export function addDays(iso: string, n: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const t = new Date(y, m - 1, d + n);
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}

const CSS = `
@page { size: A4 portrait; margin: 12mm; }
* { box-sizing: border-box; }
body { margin: 0; font: 12px/1.5 "Pretendard","Apple SD Gothic Neo","Malgun Gothic",sans-serif; color: #111; }
h1 { font-size: 20px; margin: 0 0 2px; }
.sub { color: #555; font-size: 11px; margin-bottom: 10px; }
.band { display: flex; gap: 8px; border: 1px solid #bbb; border-radius: 4px; padding: 6px 9px; margin: 0 0 8px; font-size: 11.5px; }
.band .lb { flex: none; font-weight: 700; color: #1b6a56; }
.band mark { background: #fff1b8; padding: 0 2px; }
.order b { margin-right: 4px; }
.order .n { white-space: nowrap; }
table { width: 100%; border-collapse: collapse; }
thead { display: table-header-group; }
th { text-align: left; font-size: 10.5px; color: #555; border-bottom: 1.5px solid #333; padding: 4px 5px; }
td { padding: 5px; border-bottom: 1px solid #ddd; vertical-align: top; word-break: keep-all; overflow-wrap: anywhere; }
tr { break-inside: avoid; }
tr.day td { background: #f1f5f4; font-weight: 700; border-bottom: 1px solid #bbb; padding: 3px 5px; }
.r { text-align: right; white-space: nowrap; }
.mut { color: #666; font-size: 10.5px; }
.un { color: #b45309; }
.lead { font-weight: 700; }
.ag { margin: 0 0 12px; break-inside: avoid; }
.ag .t { font-weight: 700; font-size: 14px; margin-bottom: 3px; }
.ag .t i { display: inline-block; min-width: 20px; height: 20px; line-height: 20px; text-align: center; border-radius: 10px; background: #1b6a56; color: #fff; font-style: normal; font-size: 12px; margin-right: 6px; }
.ag .b { white-space: pre-wrap; padding-left: 26px; font-size: 12.5px; }
.nt { border-top: 1.5px solid #333; margin-top: 12px; padding-top: 6px; white-space: pre-wrap; }
`;

const wrap = (title: string, body: string) =>
  `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>${esc(title)}</title><style>${CSS}</style></head><body>${body}</body></html>`;

function orderBand(order: string) {
  const names = order.split(/\s*[,，、]\s*/).filter(Boolean);
  if (!names.length) return "";
  return `<div class="band order"><span class="lb">배정 순번</span><span><b>강사 배정 →</b>${names.map((n) => `<span class="n">${esc(n)}</span>`).join(", ")}</span></div>`;
}

function guideBand(guide: string) {
  const g = guide.trim();
  if (!g) return "";
  return `<div class="band"><span class="lb">모임 안내</span><span>${esc(g).replace(/(기쁨후원|감사후원)/g, "<mark>$1</mark>")}</span></div>`;
}

/** 출강 일정표 (기간, 강사비 포함 여부 선택) */
export function scheduleHtml(data: AppData, from: string, to: string, withFee: boolean) {
  const ls = data.lectures
    .filter((l) => l.date >= from && l.date <= to)
    .sort((a, b) => a.date.localeCompare(b.date));
  let lastDate = "";
  const cols = withFee ? 5 : 4;
  const rows = ls
    .map((l) => {
      const day = l.date !== lastDate ? `<tr class="day"><td colspan="${cols}">${esc(dateLabel(l.date))}</td></tr>` : "";
      lastDate = l.date;
      const names = instructorsOf(data, l)
        .map((i) => {
          const n = unitsOf(l, i.id);
          const nm = i.id === l.leadId ? `<span class="lead">${esc(i.name)}</span>` : esc(i.name);
          return n !== l.sessions ? `${nm}<span class="mut">(${n}차시)</span>` : nm; // 강사별로 차시가 다르면 표시
        })
        .join(", ");
      const total = feeTotal(l);
      const fee = withFee
        ? `<td class="r">${total == null ? '<span class="un">단가 미정</span>' : `${won(total)}<div class="mut">${won(l.unitPrice)} × ${totalUnits(l)}차시</div>`}</td>`
        : "";
      return `${day}<tr><td>${esc(orgOf(data, l)?.name ?? "")}${[l.area ?? orgOf(data, l)?.area, l.source].filter(Boolean).length ? `<div class="mut">${esc([l.area ?? orgOf(data, l)?.area, l.source].filter(Boolean).join(" · "))}</div>` : ""}</td><td>${esc(l.target)}<div class="mut">${l.period ? `${esc(l.period)} · ` : ""}${l.sessions}차시 · ${l.minutesPerSession}분</div></td><td>${esc(l.subject)}${l.place ? `<div class="mut">${esc(l.place)}</div>` : ""}</td><td>${names || '<span class="un">미배정</span>'}</td>${fee}</tr>`;
    })
    .join("");
  const sum = withFee ? ls.reduce((s, l) => s + (feeTotal(l) ?? 0), 0) : 0;
  const body = `<h1>출강 일정</h1><div class="sub">${esc(dateLabel(from))} ~ ${esc(dateLabel(to))} · ${ls.length}건 · ${esc(data.settings.company.name)}</div>
${orderBand(data.assignOrder ?? "")}
<table><thead><tr><th>기관</th><th>대상·차시</th><th>과목·장소</th><th>강사 (진한 글씨 = 팀장)</th>${withFee ? '<th class="r">강사비</th>' : ""}</tr></thead><tbody>${rows || `<tr><td colspan="${cols}" class="mut">이 기간에 출강이 없습니다.</td></tr>`}</tbody></table>
${withFee && ls.length ? `<div class="r" style="margin-top:6px;font-weight:700">강사비 합계 ${won(sum)}</div>` : ""}`;
  return wrap("출강 일정", body);
}

/** 정기회의 안건지 */
export function agendaHtml(data: AppData, m: Meeting) {
  const items = m.agenda
    .filter((a) => a.title.trim() || a.body.trim())
    .map((a, i) => `<div class="ag"><div class="t"><i>${i + 1}</i>${esc(a.title || "(제목 없음)")}</div><div class="b">${esc(a.body)}</div></div>`)
    .join("");
  const body = `<h1>정기회의 안건</h1><div class="sub">${esc(dateLabel(m.date))}${m.time ? ` ${esc(m.time)}` : ""} · ${esc(data.settings.company.name)}</div>
${guideBand(m.guide)}${orderBand(data.assignOrder ?? "")}
${items || '<p class="mut">안건이 없습니다.</p>'}
${m.notes.trim() ? `<div class="nt"><b>메모</b>\n${esc(m.notes)}</div>` : ""}`;
  return wrap("정기회의 안건", body);
}
