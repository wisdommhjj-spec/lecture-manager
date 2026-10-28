"use client";

import Link from "next/link";
import type { AppData, Lecture } from "@/lib/types";
import { dateLabel, feeTotal, instructorsOf, orgOf, won } from "@/lib/package";

export function sendStatus(l: Lecture) {
  const last = l.sendLogs.at(-1);
  if (!last) return <span className="chip chip-warn">서류 미발송</span>;
  return (
    <span className="chip chip-ok" title={`${last.to} · ${last.zipName}`}>
      서류 발송 {last.at.slice(5, 10).replace("-", "/")}
      {last.testMode ? " (테스트)" : ""}
    </span>
  );
}

export default function LectureCard({ data, l, onEdit }: { data: AppData; l: Lecture; onEdit?: () => void }) {
  const org = orgOf(data, l);
  const ins = instructorsOf(data, l);
  const fee = feeTotal(l);
  return (
    <article className="card grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
      <div className="min-w-0">
        <h3 className="font-bold">
          {org?.name ?? "기관 미정"} <small className="font-normal text-muted">{org?.area}</small>
        </h3>
        <div className="text-xs text-muted">
          {dateLabel(l.date)} · {l.target} · {l.subject} · {l.sessions}차시
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1">
          {ins.map((i) => (
            <span key={i.id} className={`chip ${i.id === l.leadId ? "border-accent" : ""}`}>
              {i.id === l.leadId && <b className="mr-1 text-[10px] text-accent">대표</b>}
              {i.name}
            </span>
          ))}
          {!ins.length && <span className="chip chip-warn">강사 미배정</span>}
          <span className="chip">{l.account === "corp" ? "법인계좌" : "개인계좌"}</span>
          {sendStatus(l)}
        </div>
      </div>
      <div className="flex flex-wrap items-start gap-2 sm:flex-col sm:items-end">
        <span className="text-sm font-medium tabular-nums">{fee == null ? <span className="chip chip-warn">단가 미정</span> : won(fee)}</span>
        <div className="flex gap-1.5">
          {onEdit && (
            <button className="btn btn-sm" onClick={onEdit}>
              수정
            </button>
          )}
          <Link className="btn btn-sm btn-primary" href={`/package/${l.id}`}>
            서류 패키지
          </Link>
        </div>
      </div>
    </article>
  );
}
