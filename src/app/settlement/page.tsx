"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { orgOf, won } from "@/lib/package";
import PageHead from "@/components/PageHead";

// MVP에서는 출강 데이터로 강사료를 모아 보는 것까지만 합니다.
// 입금 확인, 후원금, 강사 지급, 월말 명세서는 실사용 단계에서 기존 '바움 출강 관리'에서 옮겨 옵니다.

export default function Settlement() {
  const { data } = useStore();
  const months = data ? Array.from(new Set(data.lectures.map((l) => l.date.slice(0, 7)))).sort() : [];
  const [m, setM] = useState(() => new Date().toISOString().slice(0, 7));
  if (!data) return <p className="muted">불러오는 중…</p>;
  const month = months.includes(m) ? m : (months.at(-1) ?? m);

  const ls = data.lectures.filter((l) => l.date.startsWith(month)).sort((a, b) => a.date.localeCompare(b.date));
  const per = new Map<string, { n: number; sum: number; unk: number }>();
  let corp = 0, personal = 0, unk = 0;
  ls.forEach((l) => {
    const each = l.unitPrice == null ? null : l.unitPrice * l.sessions;
    if (each == null) unk++;
    else if (l.account === "corp") corp += each * l.instructorIds.length;
    else personal += each * l.instructorIds.length;
    l.instructorIds.forEach((id) => {
      const p = per.get(id) ?? { n: 0, sum: 0, unk: 0 };
      p.n++;
      if (each == null) p.unk++;
      else p.sum += each;
      per.set(id, p);
    });
  });
  const name = (id: string) => data.instructors.find((i) => i.id === id)?.name ?? id;
  const kpi = (label: string, v: string, tone = "") => (
    <div className="card px-4 py-3">
      <span className="text-xs text-muted">{label}</span>
      <b className={`mt-0.5 block text-xl tabular-nums ${tone}`}>{v}</b>
    </div>
  );

  return (
    <div className="grid gap-4">
      <PageHead
        title="정산관리"
        desc="출강일 기준으로 월별 강사료를 모아 봅니다."
        right={
          <select className="input w-auto" value={month} onChange={(e) => setM(e.target.value)} aria-label="월">
            {months.map((x) => (
              <option key={x} value={x}>
                {x.slice(0, 4)}년 {Number(x.slice(5))}월
              </option>
            ))}
          </select>
        }
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {kpi("출강", `${ls.length}건`)}
        {kpi("법인계좌 청구", won(corp))}
        {kpi("개인계좌 (강사 직접 수령)", won(personal))}
        {kpi("단가 미정", `${unk}건`, unk ? "text-warn" : "")}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="card overflow-x-auto p-0">
          <h2 className="h2 px-4 pt-3 pb-2">강사별 강사료</h2>
          <table className="tbl">
            <thead>
              <tr>
                <th>강사</th>
                <th className="text-right">출강</th>
                <th className="text-right">강사료</th>
              </tr>
            </thead>
            <tbody>
              {[...per.entries()]
                .sort((a, b) => name(a[0]).localeCompare(name(b[0]), "ko"))
                .map(([id, p]) => (
                  <tr key={id}>
                    <td className="font-medium">{name(id)}</td>
                    <td className="text-right tabular-nums">{p.n}건</td>
                    <td className="text-right tabular-nums">
                      {won(p.sum)}
                      {p.unk > 0 && <span className="ml-1 text-xs text-warn">+미정 {p.unk}</span>}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </section>
        <section className="card overflow-x-auto p-0">
          <h2 className="h2 px-4 pt-3 pb-2">출강별 청구</h2>
          <table className="tbl">
            <thead>
              <tr>
                <th>출강일</th>
                <th>기관</th>
                <th>계좌</th>
                <th className="text-right">금액</th>
              </tr>
            </thead>
            <tbody>
              {ls.map((l) => (
                <tr key={l.id}>
                  <td className="tabular-nums">{l.date.slice(5).replace("-", ".")}</td>
                  <td>{orgOf(data, l)?.name}</td>
                  <td>{l.account === "corp" ? "법인" : "개인"}</td>
                  <td className="text-right tabular-nums">{l.unitPrice == null ? <span className="text-warn">단가 미정</span> : won(l.unitPrice * l.sessions * l.instructorIds.length)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
      <p className="text-xs text-muted">입금 확인, 후원금, 강사 지급, 월말 명세서는 다음 단계에서 추가됩니다.</p>
    </div>
  );
}
