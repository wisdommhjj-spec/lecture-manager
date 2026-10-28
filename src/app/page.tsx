"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import LectureCard from "@/components/LectureCard";

const todayIso = () => new Date().toISOString().slice(0, 10);

export default function Home() {
  const { data } = useStore();
  if (!data) return <p className="muted">불러오는 중…</p>;
  const today = todayIso();
  const upcoming = data.lectures.filter((l) => l.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  const unsent = upcoming.filter((l) => !l.sendLogs.length);
  const sent = data.lectures.filter((l) => l.sendLogs.length).length;
  const stat = (v: string | number, label: string, warn = false) => (
    <div className="card min-w-28 px-3 py-2">
      <b className={`block text-lg tabular-nums ${warn ? "text-warn" : ""}`}>{v}</b>
      <span className="text-xs text-muted">{label}</span>
    </div>
  );
  return (
    <div className="grid gap-5">
      <section>
        <h1 className="h1">출강매니저</h1>
        <p className="muted">강의의뢰를 등록하면 행정서류 5종을 만들어 확인하고, 수락하면 zip으로 묶어 기관에 메일로 보냅니다.</p>
      </section>
      <section className="flex flex-wrap gap-2">
        {stat(`${upcoming.length}건`, "다가오는 출강")}
        {stat(`${unsent.length}건`, "서류 발송 전", unsent.length > 0)}
        {stat(`${sent}건`, "서류 발송 완료")}
        {stat(`${data.instructors.length}명`, "강사")}
        {stat(`${data.orgs.length}곳`, "기관")}
      </section>
      <section className="grid gap-2">
        <div className="flex items-center justify-between">
          <h2 className="h2">서류를 보내야 하는 출강</h2>
          <Link href="/schedule?new=1" className="btn btn-primary">
            강의의뢰 등록
          </Link>
        </div>
        {unsent.length ? (
          unsent.map((l) => <LectureCard key={l.id} data={data} l={l} />)
        ) : (
          <div className="card text-center text-muted">서류를 보내야 하는 출강이 없습니다.</div>
        )}
      </section>
    </div>
  );
}
