"use client";

import { useState } from "react";
import { uid, useStore } from "@/lib/store";
import type { Instructor, Unavail } from "@/lib/types";
import { unavailText } from "@/lib/assign";
import { FileUpload } from "@/components/Files";

const blank = (): Instructor => ({
  id: uid("ins"), name: "", phone: "", email: "", birth: "", address: "",
  education: [], career: [], certificates: [], bankName: "", accountNumber: "",
});

export default function Instructors() {
  const { data, update } = useStore();
  const [edit, setEdit] = useState<Instructor | null>(null);
  if (!data) return <p className="muted">불러오는 중…</p>;

  const count = (id: string) => data.lectures.filter((l) => l.instructorIds.includes(id)).length;
  function save(i: Instructor) {
    update((d) => ({
      ...d,
      instructors: d.instructors.some((x) => x.id === i.id) ? d.instructors.map((x) => (x.id === i.id ? i : x)) : [...d.instructors, i],
    }));
    setEdit(null);
  }

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between">
        <h1 className="h1">강사관리 <span className="text-base font-normal text-muted">{data.instructors.length}명</span></h1>
        <button className="btn btn-primary" onClick={() => setEdit(blank())}>
          강사 추가
        </button>
      </div>
      <p className="muted">강사카드에 들어가는 정보입니다. 개인 통장사본은 강사가 개인계좌로 받기를 요청할 때 서류 패키지에 들어갑니다.</p>
      <div className="card overflow-x-auto p-0">
        <table className="tbl">
          <thead>
            <tr>
              <th>이름</th>
              <th>연락처</th>
              <th>이메일</th>
              <th>출강</th>
              <th>배정 제외 일정</th>
              <th>개인 통장사본</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {data.instructors.map((i) => (
              <tr key={i.id}>
                <td className="font-bold">{i.name}</td>
                <td className="tabular-nums">{i.phone}</td>
                <td>{i.email}</td>
                <td>{count(i.id)}건</td>
                <td className="text-xs">{i.unavail?.length ? i.unavail.map((u) => unavailText(u)).join(" · ") : <span className="text-muted">없음</span>}</td>
                <td>{i.accountCopy ? <span className="chip chip-ok">있음</span> : <span className="chip chip-warn">없음</span>}</td>
                <td>
                  <button className="btn btn-sm" onClick={() => setEdit(i)}>
                    수정
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {edit && <Editor key={edit.id} initial={edit} onSave={save} onClose={() => setEdit(null)} />}
    </div>
  );
}

function Editor({ initial, onSave, onClose }: { initial: Instructor; onSave: (i: Instructor) => void; onClose: () => void }) {
  const [i, setI] = useState(initial);
  const f = (k: keyof Instructor, label: string, placeholder = "") => (
    <label className="label">
      {label}
      <input className="input" placeholder={placeholder} value={String(i[k] ?? "")} onChange={(e) => setI({ ...i, [k]: e.target.value })} />
    </label>
  );
  const setU = (id: string, patch: Partial<Unavail>) => setI({ ...i, unavail: (i.unavail ?? []).map((u) => (u.id === id ? { ...u, ...patch } : u)) });
  const lines = (k: "education" | "career" | "certificates", label: string) => (
    <label className="label sm:col-span-2">
      {label} (한 줄에 하나)
      <textarea className="input" rows={3} value={i[k].join("\n")} onChange={(e) => setI({ ...i, [k]: e.target.value.split("\n") })} />
    </label>
  );
  return (
    <div className="fixed inset-0 z-10 flex justify-center overflow-auto bg-black/50 p-4" onClick={onClose}>
      <div className="card my-auto h-fit w-full max-w-2xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="강사 정보">
        <h2 className="h2 mb-3">강사 정보</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {f("name", "이름")}
          {f("phone", "연락처", "010-0000-0000")}
          {f("email", "이메일")}
          {f("birth", "생년월일", "1980.01.01")}
          <div className="sm:col-span-2">{f("address", "주소")}</div>
          {lines("education", "학력")}
          {lines("career", "주요 경력")}
          {lines("certificates", "자격")}
          {f("bankName", "은행")}
          {f("accountNumber", "계좌번호")}
          <div className="label sm:col-span-2">
            배정 제외 일정 (이 날은 자동 배정에서 빠집니다 · 사유는 담당자에게만 보임)
            <div className="grid gap-2">
              {(i.unavail ?? []).map((u) => (
                <div key={u.id} className="grid grid-cols-[110px_1fr_1fr_auto] items-center gap-2">
                  <select className="input" value={u.kind} onChange={(e) => setU(u.id, { kind: e.target.value as Unavail["kind"] })}>
                    <option value="date">하루</option>
                    <option value="range">기간</option>
                    <option value="weekday">매주 요일</option>
                  </select>
                  {u.kind === "weekday" ? (
                    <select className="input" value={u.weekday ?? 1} onChange={(e) => setU(u.id, { weekday: Number(e.target.value) })}>
                      {["일", "월", "화", "수", "목", "금", "토"].map((w, n) => (
                        <option key={w} value={n}>{w}요일</option>
                      ))}
                    </select>
                  ) : (
                    <input className="input" type="date" value={u.from ?? ""} onChange={(e) => setU(u.id, { from: e.target.value })} />
                  )}
                  {u.kind === "range" ? (
                    <input className="input" type="date" value={u.to ?? ""} onChange={(e) => setU(u.id, { to: e.target.value })} />
                  ) : (
                    <input className="input" placeholder="사유 메모" value={u.note} onChange={(e) => setU(u.id, { note: e.target.value })} />
                  )}
                  <button type="button" className="btn btn-sm" onClick={() => setI({ ...i, unavail: (i.unavail ?? []).filter((x) => x.id !== u.id) })}>삭제</button>
                  {u.kind === "range" && (
                    <input className="input col-span-4" placeholder="사유 메모" value={u.note} onChange={(e) => setU(u.id, { note: e.target.value })} />
                  )}
                </div>
              ))}
              <button type="button" className="btn btn-sm justify-self-start" onClick={() => setI({ ...i, unavail: [...(i.unavail ?? []), { id: uid("un"), kind: "date", from: "", note: "" }] })}>
                제외 일정 추가
              </button>
            </div>
          </div>
          <div className="label sm:col-span-2">
            개인 통장사본
            <FileUpload label="통장사본" value={i.accountCopy} onChange={(accountCopy) => setI({ ...i, accountCopy })} />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn" onClick={onClose}>
            취소
          </button>
          <button
            className="btn btn-primary"
            onClick={() => i.name.trim() && onSave({ ...i, education: i.education.filter(Boolean), career: i.career.filter(Boolean), certificates: i.certificates.filter(Boolean), unavail: (i.unavail ?? []).filter((u) => u.kind === "weekday" || u.from) })}
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
