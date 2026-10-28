"use client";

import Link from "next/link";
import { uid, useStore } from "@/lib/store";
import type { Curriculum, PlanSession } from "@/lib/types";
import { FileUpload } from "@/components/Files";

export default function Vault() {
  const { data, update } = useStore();
  if (!data) return <p className="muted">불러오는 중…</p>;
  const s = data.settings;

  const setCur = (id: string, fn: (c: Curriculum) => Curriculum) =>
    update((d) => ({ ...d, curricula: d.curricula.map((c) => (c.id === id ? fn(c) : c)) }));

  return (
    <div className="grid gap-4">
      <h1 className="h1">보관함</h1>
      <p className="muted">한 번 올려 두면 서류 패키지를 만들 때마다 자동으로 들어갑니다.</p>

      <section className="card grid gap-3">
        <h2 className="h2">회사 서류</h2>
        <div className="grid gap-1">
          <b>사업자등록증</b>
          <FileUpload label="사업자등록증" value={s.businessRegistration} onChange={(businessRegistration) => update((d) => ({ ...d, settings: { ...d.settings, businessRegistration } }))} />
        </div>
        <div className="grid gap-1">
          <b>법인 통장사본</b> <span className="text-xs text-muted">입금 계좌가 법인계좌(기본)일 때 들어갑니다.</span>
          <FileUpload label="법인 통장사본" value={s.corpAccountCopy} onChange={(corpAccountCopy) => update((d) => ({ ...d, settings: { ...d.settings, corpAccountCopy } }))} />
        </div>
      </section>

      <section className="card grid gap-2">
        <h2 className="h2">강사 개인 통장사본</h2>
        <p className="text-xs text-muted">기관이 강사 개인계좌로 강사료를 보내겠다고 할 때 들어갑니다.</p>
        <div className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
          {data.instructors.map((i) => (
            <div key={i.id} className="flex flex-wrap items-center gap-2">
              <b className="w-16">{i.name}</b>
              <FileUpload
                label={`${i.name} 통장사본`}
                value={i.accountCopy}
                onChange={(accountCopy) => update((d) => ({ ...d, instructors: d.instructors.map((x) => (x.id === i.id ? { ...x, accountCopy } : x)) }))}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-3">
        <div className="flex items-center justify-between">
          <h2 className="h2">강의계획서 내용 묶음 (과목별)</h2>
          <button
            className="btn"
            onClick={() =>
              update((d) => ({
                ...d,
                curricula: [...d.curricula, { id: uid("cur"), subject: "새 과목", label: "", purpose: "", sessions: [{ topics: [{ theme: "", content: "", remark: "" }], effects: "" }] }],
              }))
            }
          >
            과목 추가
          </button>
        </div>
        <p className="text-xs text-muted">
          일정의 과목과 이름이 같은 묶음을 불러와 강의계획서를 채웁니다. 서류 패키지 화면에서 그 일정만 따로 고칠 수도 있습니다.{" "}
          <Link className="underline" href="/schedule">
            일정 보기
          </Link>
        </p>
        {data.curricula.map((c) => (
          <div key={c.id} className="card grid gap-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="label">
                과목명
                <input className="input font-bold" value={c.subject} onChange={(e) => setCur(c.id, (x) => ({ ...x, subject: e.target.value }))} />
              </label>
              <label className="label">
                설명 (예: 초등 3~4학년)
                <input className="input" value={c.label} onChange={(e) => setCur(c.id, (x) => ({ ...x, label: e.target.value }))} />
              </label>
              <label className="label sm:col-span-2">
                교육 목적
                <textarea className="input" rows={4} value={c.purpose} onChange={(e) => setCur(c.id, (x) => ({ ...x, purpose: e.target.value }))} />
              </label>
            </div>
            {c.sessions.map((s2, si) => (
              <SessionEditor
                key={si}
                n={si + 1}
                s={s2}
                onChange={(ns) => setCur(c.id, (x) => ({ ...x, sessions: x.sessions.map((y, j) => (j === si ? ns : y)) }))}
                onRemove={() => setCur(c.id, (x) => ({ ...x, sessions: x.sessions.filter((_, j) => j !== si) }))}
              />
            ))}
            <div className="flex justify-between">
              <button className="btn btn-sm" onClick={() => setCur(c.id, (x) => ({ ...x, sessions: [...x.sessions, { topics: [{ theme: "", content: "", remark: "" }], effects: "" }] }))}>
                차시 추가
              </button>
              <button className="btn btn-sm text-bad" onClick={() => confirm(`${c.subject} 묶음을 지울까요?`) && update((d) => ({ ...d, curricula: d.curricula.filter((x) => x.id !== c.id) }))}>
                과목 삭제
              </button>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

function SessionEditor({ n, s, onChange, onRemove }: { n: number; s: PlanSession; onChange: (s: PlanSession) => void; onRemove: () => void }) {
  const setT = (ti: number, k: "theme" | "content" | "remark", v: string) => onChange({ ...s, topics: s.topics.map((t, j) => (j === ti ? { ...t, [k]: v } : t)) });
  return (
    <div className="grid gap-2 rounded-md border border-line bg-bg p-3">
      <div className="flex items-center justify-between">
        <b>{n}차시</b>
        <button className="btn btn-sm text-bad" onClick={onRemove}>
          차시 삭제
        </button>
      </div>
      {s.topics.map((t, ti) => (
        <div key={ti} className="grid gap-2 sm:grid-cols-[1fr_2fr_1fr]">
          <input className="input" placeholder="교육주제" value={t.theme} onChange={(e) => setT(ti, "theme", e.target.value)} />
          <textarea className="input" rows={Math.max(2, t.content.split("\n").length)} placeholder={"교육내용\n# 세부 항목"} value={t.content} onChange={(e) => setT(ti, "content", e.target.value)} />
          <input className="input" placeholder="비고" value={t.remark} onChange={(e) => setT(ti, "remark", e.target.value)} />
        </div>
      ))}
      <button className="btn btn-sm w-fit" onClick={() => onChange({ ...s, topics: [...s.topics, { theme: "", content: "", remark: "" }] })}>
        주제 추가
      </button>
      <label className="label">
        기대효과 (한 줄에 하나)
        <textarea className="input" rows={2} value={s.effects} onChange={(e) => onChange({ ...s, effects: e.target.value })} />
      </label>
    </div>
  );
}
