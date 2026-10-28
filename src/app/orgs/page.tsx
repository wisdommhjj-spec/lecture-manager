"use client";

import { uid, useStore } from "@/lib/store";
import type { Org } from "@/lib/types";

export default function Orgs() {
  const { data, update } = useStore();
  if (!data) return <p className="muted">불러오는 중…</p>;

  const setOrg = (id: string, patch: Partial<Org>) =>
    update((d) => ({ ...d, orgs: d.orgs.map((o) => (o.id === id ? { ...o, ...patch } : o)) }));
  const add = () =>
    update((d) => ({ ...d, orgs: [...d.orgs, { id: uid("org"), name: "새 기관", area: "", contactName: "", contactEmail: "" }] }));
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between">
        <h1 className="h1">기관관리 <span className="text-base font-normal text-muted">{data.orgs.length}곳</span></h1>
        <button className="btn btn-primary" onClick={add}>
          기관 추가
        </button>
      </div>
      <p className="muted">담당자 이메일이 서류 패키지 메일의 받는 사람이 됩니다. 칸을 고치면 바로 저장됩니다.</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {data.orgs.map((o) => {
          const ls = data.lectures.filter((l) => l.orgId === o.id);
          const next = ls.filter((l) => l.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0];
          return (
            <div key={o.id} className="card grid gap-2">
              <div className="grid grid-cols-2 gap-2">
                <label className="label">
                  기관명
                  <input className="input font-bold" value={o.name} onChange={(e) => setOrg(o.id, { name: e.target.value })} />
                </label>
                <label className="label">
                  지역
                  <input className="input" value={o.area} onChange={(e) => setOrg(o.id, { area: e.target.value })} />
                </label>
                <label className="label">
                  담당자
                  <input className="input" value={o.contactName} onChange={(e) => setOrg(o.id, { contactName: e.target.value })} />
                </label>
                <label className="label">
                  담당자 이메일
                  <input
                    className={`input ${o.contactEmail ? "" : "border-warn"}`}
                    type="email"
                    placeholder="서류 받을 이메일"
                    value={o.contactEmail}
                    onChange={(e) => setOrg(o.id, { contactEmail: e.target.value.trim() })}
                  />
                </label>
              </div>
              <div className="flex justify-between text-xs text-muted">
                <span>출강 {ls.length}회</span>
                <span>{next ? `다음 출강 ${next.date.slice(5).replace("-", "/")}` : "예정 없음"}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
