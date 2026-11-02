"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import {
  SETTLE_LABEL, donationOf, donationRateOf, feeOf, feeTotal, orgOf, settleStatus, unitsOf, won,
} from "@/lib/package";
import type { Lecture } from "@/lib/types";
import PageHead from "@/components/PageHead";

/**
 * 정산관리
 * - 강사료 = 1차시 단가 × 강사별 차시 수, 후원금 = 강사료 × 비율(기본 20%)
 * - 법인계좌: 조합이 (강사료 − 후원금)을 강사에게 지급 → 지급일 기록
 * - 개인계좌: 강사가 후원금을 조합에 납부 → 납부일 기록
 * - 상태: 계산서 발행 전 → 입금 대기 → 입금 완료
 */
export default function Settlement() {
  const { data, update } = useStore();
  const months = data ? Array.from(new Set(data.lectures.map((l) => l.date.slice(0, 7)))).sort() : [];
  const [m, setM] = useState(() => new Date().toISOString().slice(0, 7));
  if (!data) return <p className="muted">불러오는 중…</p>;
  const month = months.includes(m) ? m : (months.at(-1) ?? m);
  const rate = donationRateOf(data);

  const ls = data.lectures.filter((l) => l.date.startsWith(month)).sort((a, b) => a.date.localeCompare(b.date));
  const name = (id: string) => data.instructors.find((i) => i.id === id)?.name ?? id;

  const patch = (id: string, fn: (l: Lecture) => Lecture) =>
    update((d) => ({ ...d, lectures: d.lectures.map((l) => (l.id === id ? fn(l) : l)) }));
  const setDate = (id: string, key: "invoiceDate" | "depositDate", v: string) =>
    patch(id, (l) => ({ ...l, [key]: v || undefined }));
  const setMap = (id: string, key: "payouts" | "donations", insId: string, v: string) =>
    patch(id, (l) => {
      const next = { ...(l[key] ?? {}) };
      if (v) next[insId] = v;
      else delete next[insId];
      return { ...l, [key]: next };
    });
  const setUnits = (id: string, insId: string, n: number) =>
    patch(id, (l) => ({ ...l, units: { ...(l.units ?? {}), [insId]: Math.max(0, n) } }));

  // 월 합계
  let total = 0, donation = 0, unk = 0, pre = 0, wait = 0;
  ls.forEach((l) => {
    const t = feeTotal(l);
    if (t == null) return void unk++;
    total += t;
    l.instructorIds.forEach((id) => (donation += donationOf(feeOf(l, id) ?? 0, rate)));
    const st = settleStatus(l);
    if (st === "pre") pre++;
    if (st === "wait") wait++;
  });

  // 강사별 명세
  const byIns = new Map<string, Lecture[]>();
  ls.forEach((l) => l.instructorIds.forEach((id) => byIns.set(id, [...(byIns.get(id) ?? []), l])));
  const insIds = [...byIns.keys()].sort((a, b) => name(a).localeCompare(name(b), "ko"));

  function csv() {
    const rows: (string | number)[][] = [
      ["출강일", "기관", "강사", "차시", "1차시 단가", "강사료", `후원금(${rate}%)`, "계좌", "지급/납부 금액", "지급/납부일", "계산서 발행일", "입금일", "상태"],
    ];
    ls.forEach((l) =>
      l.instructorIds.forEach((id) => {
        const fee = feeOf(l, id);
        const don = fee == null ? null : donationOf(fee, rate);
        const corp = l.account === "corp";
        rows.push([
          l.date, orgOf(data!, l)?.name ?? "", name(id), unitsOf(l, id), l.unitPrice ?? "", fee ?? "", don ?? "",
          corp ? "법인" : "개인",
          fee == null || don == null ? "" : corp ? fee - don : don,
          (corp ? l.payouts?.[id] : l.donations?.[id]) ?? "",
          l.invoiceDate ?? "", l.depositDate ?? "", SETTLE_LABEL[settleStatus(l)],
        ]);
      }),
    );
    const text = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["﻿" + text], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `정산_${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const kpi = (label: string, v: string, tone = "") => (
    <div className="card px-4 py-3">
      <span className="text-xs text-muted">{label}</span>
      <b className={`mt-0.5 block text-xl tabular-nums ${tone}`}>{v}</b>
    </div>
  );
  const dateIn = (v: string | undefined, on: (v: string) => void, label: string) => (
    <input className="input w-36 py-1" type="date" aria-label={label} value={v ?? ""} onChange={(e) => on(e.target.value)} />
  );
  const tone = (s: ReturnType<typeof settleStatus>) =>
    s === "paid" ? "text-ok" : s === "wait" ? "text-warn" : s === "nopay" ? "text-bad" : "text-muted";

  return (
    <div className="grid gap-4">
      <PageHead
        title="정산관리"
        desc={`강사료 = 1차시 단가 × 강사별 차시 수 · 후원금 ${rate}% · 날짜는 직접 선택해 기록합니다.`}
        right={
          <div className="flex items-center gap-2">
            <select className="input w-auto" value={month} onChange={(e) => setM(e.target.value)} aria-label="월">
              {months.map((x) => (
                <option key={x} value={x}>
                  {x.slice(0, 4)}년 {Number(x.slice(5))}월
                </option>
              ))}
            </select>
            <button className="btn" onClick={csv} disabled={!ls.length}>
              CSV 내려받기
            </button>
          </div>
        }
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {kpi("출강", `${ls.length}건`)}
        {kpi("강사료 합계", won(total))}
        {kpi(`후원금 (${rate}%)`, won(donation))}
        {kpi("계산서 발행 전 / 입금 대기", `${pre}건 / ${wait}건`, pre + wait ? "text-warn" : "")}
        {kpi("단가 미정", `${unk}건`, unk ? "text-bad" : "")}
      </div>

      <section className="card overflow-x-auto p-0">
        <h2 className="h2 px-4 pt-3 pb-2">출강별 청구</h2>
        <table className="tbl">
          <thead>
            <tr>
              <th>출강일</th>
              <th>기관</th>
              <th>계좌</th>
              <th className="text-right">금액</th>
              <th>상태</th>
              <th>계산서 발행일</th>
              <th>입금일</th>
            </tr>
          </thead>
          <tbody>
            {ls.map((l) => {
              const st = settleStatus(l);
              const t = feeTotal(l);
              return (
                <tr key={l.id}>
                  <td className="tabular-nums">{l.date.slice(5).replace("-", ".")}</td>
                  <td>{orgOf(data, l)?.name}</td>
                  <td>{l.account === "corp" ? "법인" : "개인"}</td>
                  <td className="text-right tabular-nums">{t == null ? <span className="text-warn">단가 미정</span> : won(t)}</td>
                  <td className={`font-medium ${tone(st)}`}>{SETTLE_LABEL[st]}</td>
                  <td>{dateIn(l.invoiceDate, (v) => setDate(l.id, "invoiceDate", v), "계산서 발행일")}</td>
                  <td>{dateIn(l.depositDate, (v) => setDate(l.id, "depositDate", v), "입금일")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="grid gap-3">
        <h2 className="h2">강사별 명세서</h2>
        {insIds.map((id) => {
          let fees = 0, dons = 0;
          byIns.get(id)!.forEach((l) => {
            const f = feeOf(l, id);
            if (f != null) {
              fees += f;
              dons += donationOf(f, rate);
            }
          });
          return (
            <div key={id} className="card overflow-x-auto p-0">
              <div className="flex flex-wrap items-baseline justify-between gap-2 px-4 pt-3 pb-2">
                <b>{name(id)}</b>
                <span className="text-sm text-muted tabular-nums">
                  강사료 {won(fees)} · 후원금 {won(dons)} · 법인 지급 대상 {won(sumCorp(byIns.get(id)!, id, rate))}
                </span>
              </div>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>출강일</th>
                    <th>기관</th>
                    <th className="text-right">차시</th>
                    <th className="text-right">강사료</th>
                    <th className="text-right">후원금</th>
                    <th>구분</th>
                    <th className="text-right">금액</th>
                    <th>날짜</th>
                  </tr>
                </thead>
                <tbody>
                  {byIns.get(id)!.map((l) => {
                    const fee = feeOf(l, id);
                    const don = fee == null ? null : donationOf(fee, rate);
                    const corp = l.account === "corp";
                    return (
                      <tr key={l.id}>
                        <td className="tabular-nums">{l.date.slice(5).replace("-", ".")}</td>
                        <td>{orgOf(data, l)?.name}</td>
                        <td className="text-right">
                          <input
                            className="input w-16 py-1 text-right"
                            type="number"
                            min={0}
                            aria-label={`${name(id)} 차시`}
                            value={unitsOf(l, id)}
                            onChange={(e) => setUnits(l.id, id, Number(e.target.value) || 0)}
                          />
                        </td>
                        <td className="text-right tabular-nums">{won(fee)}</td>
                        <td className="text-right tabular-nums">{won(don)}</td>
                        <td>{corp ? "법인 지급" : "후원금 납부"}</td>
                        <td className="text-right tabular-nums">{fee == null || don == null ? "-" : won(corp ? fee - don : don)}</td>
                        <td>
                          {corp
                            ? dateIn(l.payouts?.[id], (v) => setMap(l.id, "payouts", id, v), "지급일")
                            : dateIn(l.donations?.[id], (v) => setMap(l.id, "donations", id, v), "납부일")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}
        {!insIds.length && <p className="muted">이 달에는 출강이 없습니다.</p>}
      </section>
      <p className="text-xs text-muted">
        개인계좌 출강은 배정된 강사 모두가 후원금을 납부하는 것으로 계산합니다. 주민번호·계좌번호는 이 화면에 저장하지 않습니다.
      </p>
    </div>
  );
}

function sumCorp(ls: Lecture[], id: string, rate: number) {
  return ls.reduce((s, l) => {
    if (l.account !== "corp") return s;
    const f = feeOf(l, id);
    return f == null ? s : s + f - donationOf(f, rate);
  }, 0);
}
