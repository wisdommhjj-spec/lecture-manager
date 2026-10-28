"use client";

import Link from "next/link";
import type { AppData, Lecture } from "@/lib/types";
import { WEEK, docStatus, feeTotal, orgOf, shortInstructors, won, type DocStatus } from "@/lib/package";

const TONE = { sent: "text-ok", ready: "text-warn", check: "text-bad" } as const;
const CHIP = { sent: "bg-ok-soft text-ok", ready: "bg-[#f2f4f6] text-[#4e5968]", check: "bg-bad-soft text-bad" } as const;

export function StatusDot({ s }: { s: DocStatus }) {
  return (
    <div>
      <span className={`dot ${TONE[s.kind]}`}>{s.label}</span>
      {s.note && <div className="mt-0.5 text-[11px] text-bad">{s.note}</div>}
      {s.at && <div className="mt-0.5 text-[11px] text-muted">{s.at.slice(5, 10).replace("-", ".")}</div>}
    </div>
  );
}

const dayOf = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${String(m).padStart(2, "0")}.${String(d).padStart(2, "0")} (${WEEK[new Date(y, m - 1, d).getDay()]})`;
};

/** PC 화면: 업무용 표 */
export function LectureTable({ data, list, onEdit }: { data: AppData; list: Lecture[]; onEdit?: (l: Lecture) => void }) {
  return (
    <div className="card overflow-x-auto p-0">
      <table className="tbl">
        <thead>
          <tr>
            <th>출강일</th>
            <th>기관</th>
            <th>대상</th>
            <th>과목</th>
            <th>강사</th>
            <th className="text-right">강사료</th>
            <th>계좌</th>
            <th>서류</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {list.map((l) => {
            const fee = feeTotal(l);
            return (
              <tr key={l.id}>
                <td className="whitespace-nowrap tabular-nums">{dayOf(l.date)}</td>
                <td className="font-bold whitespace-nowrap">{orgOf(data, l)?.name ?? "기관 미정"}</td>
                <td className="whitespace-nowrap">{l.target}</td>
                <td className="whitespace-nowrap">
                  {l.subject} <span className="text-muted">{l.sessions}차시</span>
                </td>
                <td className="whitespace-nowrap">{shortInstructors(data, l)}</td>
                <td className="text-right whitespace-nowrap tabular-nums">{fee == null ? "-" : fee.toLocaleString("ko-KR")}</td>
                <td>{l.account === "corp" ? "법인" : "개인"}</td>
                <td>
                  <StatusDot s={docStatus(data, l)} />
                </td>
                <td className="text-right whitespace-nowrap">
                  {onEdit && (
                    <button className="mr-3 text-muted hover:text-ink" onClick={() => onEdit(l)}>
                      수정
                    </button>
                  )}
                  <Link className="font-semibold text-accent hover:underline" href={`/package/${l.id}`}>
                    서류 패키지
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** 휴대폰 화면: 카드 + 큰 버튼 */
export default function LectureCard({ data, l, onEdit }: { data: AppData; l: Lecture; onEdit?: () => void }) {
  const s = docStatus(data, l);
  const fee = feeTotal(l);
  return (
    <article className="rounded-xl border border-line bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <b className="text-[15.5px]">{orgOf(data, l)?.name ?? "기관 미정"}</b>
        <span className={`rounded-md px-2 py-0.5 text-[11.5px] font-bold ${CHIP[s.kind]}`}>{s.label}</span>
      </div>
      <div className="mt-1 text-[12.5px] text-muted">
        {dayOf(l.date)} · {l.target} {l.sessions}차시 · {shortInstructors(data, l)} · {won(fee)}
      </div>
      {s.note && <div className="mt-1.5 text-xs text-bad">⚠ {s.note}</div>}
      <div className="mt-3 flex gap-2">
        {onEdit && (
          <button className="flex-1 rounded-lg bg-[#f2f4f6] py-2.5 font-bold text-[#333]" onClick={onEdit}>
            {s.kind === "check" ? "고치기" : "수정"}
          </button>
        )}
        <Link
          href={`/package/${l.id}`}
          className={`flex-[2] rounded-lg py-2.5 text-center font-bold ${s.kind === "sent" ? "bg-[#f2f4f6] text-[#333]" : "bg-accent text-white"}`}
        >
          {s.kind === "sent" ? "발송 내역 보기" : "서류 확인하고 보내기"}
        </Link>
      </div>
    </article>
  );
}

/** PC는 표, 휴대폰은 카드로 */
export function LectureList({ data, list, onEdit, empty }: { data: AppData; list: Lecture[]; onEdit?: (l: Lecture) => void; empty: string }) {
  if (!list.length) return <div className="card text-center text-muted">{empty}</div>;
  return (
    <>
      <div className="hidden md:block">
        <LectureTable data={data} list={list} onEdit={onEdit} />
      </div>
      <div className="grid gap-2.5 md:hidden">
        {list.map((l) => (
          <LectureCard key={l.id} data={data} l={l} onEdit={onEdit ? () => onEdit(l) : undefined} />
        ))}
      </div>
    </>
  );
}
