import {
  AlignmentType, BorderStyle, Document, HeadingLevel, Packer, PageBreak, Paragraph, ShadingType,
  Table, TableCell, TableRow, TextRun, VerticalAlign, WidthType,
} from "docx";
import type { AppData, Instructor, Lecture, LessonPlan } from "./types";
import { dateLabel, feeTotal, instructorsOf, orgOf, won } from "./package";

// 학교에서 열어 보기 쉽게 워드(.docx)로 만듭니다. 한글(HWP)에서도 열립니다.

const FONT = "맑은 고딕";
const HEAD_FILL = "E8F1EE";
const line = { style: BorderStyle.SINGLE, size: 4, color: "333333" };
const borders = { top: line, bottom: line, left: line, right: line };

function p(text: string, opts: { bold?: boolean; size?: number; align?: (typeof AlignmentType)[keyof typeof AlignmentType] } = {}) {
  return new Paragraph({
    alignment: opts.align,
    children: text.split("\n").map(
      (t, i) => new TextRun({ text: t, bold: opts.bold, size: opts.size ?? 20, font: FONT, break: i ? 1 : 0 }),
    ),
  });
}

function cell(text: string, o: { head?: boolean; w?: number; span?: number; rows?: number; align?: "left" | "center" } = {}) {
  return new TableCell({
    borders,
    columnSpan: o.span,
    rowSpan: o.rows,
    width: o.w ? { size: o.w, type: WidthType.PERCENTAGE } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    shading: o.head ? { type: ShadingType.CLEAR, color: "auto", fill: HEAD_FILL } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [p(text, { bold: o.head, align: o.align === "left" ? AlignmentType.LEFT : AlignmentType.CENTER })],
  });
}

const table = (rows: TableRow[]) => new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows });
const row = (cells: TableCell[]) => new TableRow({ children: cells });
const title = (t: string) =>
  new Paragraph({
    heading: HeadingLevel.TITLE,
    alignment: AlignmentType.CENTER,
    spacing: { after: 240 },
    children: [new TextRun({ text: t, bold: true, size: 40, font: FONT, underline: {} })],
  });
const gap = () => new Paragraph({ spacing: { after: 120 }, children: [] });
const section = (t: string) =>
  new Paragraph({ spacing: { before: 200, after: 80 }, children: [new TextRun({ text: `ρ${t}`, bold: true, size: 22, font: FONT })] });

const pack = (children: (Paragraph | Table)[]) =>
  Packer.toBlob(new Document({ styles: { default: { document: { run: { font: FONT } } } }, sections: [{ children }] }));

/* ---------- 강의계획서 (바움 양식) ---------- */
export function lessonPlanDocx(plan: LessonPlan, data: AppData) {
  const head = table([
    row([cell("과목명", { head: true, w: 15 }), cell(plan.subject, { w: 35 }), cell("장소", { head: true, w: 15 }), cell(plan.place, { w: 35 })]),
    row([cell("담당 강사", { head: true }), cell(plan.instructorsText), cell("대상", { head: true }), cell(plan.target)]),
    row([cell("대표 강사 연락처", { head: true }), cell(plan.leadPhone), cell("교육시간", { head: true }), cell(plan.totalTime)]),
  ]);
  const body: (Paragraph | Table)[] = [
    title("강의 계획서"),
    p(`[${plan.schoolYear}]`, { bold: true }),
    head,
    section("교육 목적"),
    table([row([cell(plan.purpose, { align: "left" })])]),
  ];
  plan.sessions.forEach((s) => {
    body.push(gap());
    const rows = [row([cell("차시", { head: true, w: 12 }), cell("교육주제", { head: true, w: 20 }), cell("교육내용", { head: true, w: 48 }), cell("비고", { head: true, w: 20 })])];
    s.topics.forEach((t, i) => {
      const cells = [cell(t.theme), cell(t.content, { align: "left" }), cell(t.remark)];
      if (i === 0) cells.unshift(cell(s.label, { rows: s.topics.length }));
      rows.push(row(cells));
    });
    body.push(table(rows));
    if (s.effects.trim()) {
      body.push(section("기대효과"));
      s.effects.split("\n").filter(Boolean).forEach((e) => body.push(p(`- ${e}`)));
    }
  });
  body.push(gap(), p(data.settings.company.name, { bold: true, size: 24, align: AlignmentType.CENTER }));
  return pack(body);
}

/* ---------- 견적서 ---------- */
export function quoteDocx(data: AppData, l: Lecture) {
  const c = data.settings.company;
  const org = orgOf(data, l);
  const n = l.instructorIds.length;
  const qty = n * l.sessions;
  const total = feeTotal(l);
  const today = new Date();
  const issued = `${today.getFullYear()}. ${today.getMonth() + 1}. ${today.getDate()}.`;
  return pack([
    title("견 적 서"),
    table([
      row([
        cell(`${org?.name ?? ""} 귀하\n\n견적일: ${issued}\n아래와 같이 견적합니다.`, { align: "left", w: 45, rows: 5 }),
        cell("공급자", { head: true, w: 15, rows: 5 }),
        cell("등록번호", { head: true, w: 15 }),
        cell(c.bizNo, { w: 25 }),
      ]),
      row([cell("상호", { head: true }), cell(c.name)]),
      row([cell("대표자", { head: true }), cell(c.ceo)]),
      row([cell("주소", { head: true }), cell(c.address)]),
      row([cell("연락처", { head: true }), cell(c.phone)]),
    ]),
    gap(),
    table([row([cell("합계 금액", { head: true, w: 30 }), cell(`${won(total)} (부가가치세 면세)`, { w: 70 })])]),
    gap(),
    table([
      row([cell("품명", { head: true, w: 28 }), cell("규격", { head: true, w: 22 }), cell("수량", { head: true, w: 12 }), cell("단가", { head: true, w: 18 }), cell("금액", { head: true, w: 20 })]),
      row([
        cell(`${l.subject} 강사료`),
        cell(`${l.target} · ${l.sessions}차시 × ${n}명`),
        cell(`${qty}`),
        cell(won(l.unitPrice)),
        cell(won(total)),
      ]),
      row([cell("합계", { head: true, span: 4 }), cell(won(total))]),
    ]),
    gap(),
    p(`교육일: ${dateLabel(l.date)}  /  장소: ${l.place}`),
    p(`입금 계좌: ${l.account === "corp" ? `${data.settings.corpBank.bankName} ${data.settings.corpBank.accountNumber} (${data.settings.corpBank.holder})` : "강사 개인계좌 (첨부한 통장사본 참고)"}`),
  ]);
}

/* ---------- 강사카드 (배정 강사 수만큼, 한 사람당 한 쪽) ---------- */
function instructorCard(ins: Instructor, l: Lecture, data: AppData, lead: boolean) {
  const org = orgOf(data, l);
  const list = (a: string[]) => a.filter(Boolean).join("\n") || "-";
  return [
    title("강 사 카 드"),
    table([
      row([cell("성명", { head: true, w: 18 }), cell(ins.name, { w: 32 }), cell("역할", { head: true, w: 18 }), cell(lead ? "대표 강사" : "강사", { w: 32 })]),
      row([cell("생년월일", { head: true }), cell(ins.birth), cell("연락처", { head: true }), cell(ins.phone)]),
      row([cell("이메일", { head: true }), cell(ins.email, { span: 3, align: "left" })]),
      row([cell("주소", { head: true }), cell(ins.address, { span: 3, align: "left" })]),
      row([cell("학력", { head: true }), cell(list(ins.education), { span: 3, align: "left" })]),
      row([cell("주요 경력", { head: true }), cell(list(ins.career), { span: 3, align: "left" })]),
      row([cell("자격", { head: true }), cell(list(ins.certificates), { span: 3, align: "left" })]),
      row([cell("출강 기관", { head: true }), cell(org?.name ?? ""), cell("교육일", { head: true }), cell(dateLabel(l.date))]),
      row([cell("교육 내용", { head: true }), cell(`${l.subject} (${l.target}, ${l.sessions}차시)`, { span: 3, align: "left" })]),
    ]),
    gap(),
    p(`소속: ${data.settings.company.name}`, { align: AlignmentType.RIGHT }),
  ];
}

export function instructorCardsDocx(data: AppData, l: Lecture) {
  const list = instructorsOf(data, l);
  const children: (Paragraph | Table)[] = [];
  list.forEach((ins, i) => {
    if (i) children.push(new Paragraph({ children: [new PageBreak()] }));
    children.push(...instructorCard(ins, l, data, ins.id === l.leadId));
  });
  return pack(children);
}
