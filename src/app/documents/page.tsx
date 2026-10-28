"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { docStatus } from "@/lib/package";
import { LectureList } from "@/components/LectureCard";
import PageHead, { DocTabs } from "@/components/PageHead";

const FILTERS = [
  ["todo", "보내야 할 것"],
  ["sent", "발송 완료"],
  ["all", "전체"],
] as const;

export default function Documents() {
  const { data } = useStore();
  const [f, setF] = useState<(typeof FILTERS)[number][0]>("todo");
  if (!data) return <p className="muted">불러오는 중…</p>;

  const all = [...data.lectures].sort((a, b) => a.date.localeCompare(b.date));
  const kind = new Map(all.map((l) => [l.id, docStatus(data, l).kind]));
  const count = { todo: all.filter((l) => kind.get(l.id) !== "sent").length, sent: all.filter((l) => kind.get(l.id) === "sent").length, all: all.length };
  const list = all.filter((l) => f === "all" || (f === "sent" ? kind.get(l.id) === "sent" : kind.get(l.id) !== "sent"));

  return (
    <div className="grid gap-4">
      <PageHead title="행정서류" desc="출강마다 서류 5종(강사카드·견적서·사업자등록증·계좌사본·강의계획서)을 확인하고 보냅니다." />
      <DocTabs on="status" />
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map(([k, label]) => (
          <button key={k} className={`btn btn-sm ${f === k ? "border-accent bg-accent-soft text-accent" : ""}`} onClick={() => setF(k)}>
            {label} <span className="tabular-nums opacity-70">{count[k]}</span>
          </button>
        ))}
      </div>
      <LectureList data={data} list={list} empty="해당하는 출강이 없습니다." />
    </div>
  );
}
