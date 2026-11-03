"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import type { Report } from "@/lib/types";
import { dateLabel, instructorsOf, orgOf } from "@/lib/package";

const num = (s: string) => Number(s) || 0;
const safeUrl = (u: string) => (/^https?:\/\//i.test(u.trim()) ? u.trim() : "");

/** 사진을 가로세로 900px 이하 JPEG로 줄여 data URL로 만듭니다. */
function shrink(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const im = new Image();
    im.onerror = () => {
      URL.revokeObjectURL(url);
      rej(new Error("img"));
    };
    im.onload = () => {
      const k = Math.min(1, 900 / Math.max(im.width, im.height));
      const c = document.createElement("canvas");
      c.width = Math.round(im.width * k);
      c.height = Math.round(im.height * k);
      const g = c.getContext("2d")!;
      g.fillStyle = "#fff";
      g.fillRect(0, 0, c.width, c.height);
      g.drawImage(im, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      res(c.toDataURL("image/jpeg", 0.7));
    };
    im.src = url;
  });
}

const blank = (id: string, lead: string): Report => ({
  id, topic: "", teacher: "", teacherTel: "", teacherEmail: "", content: "", notes: "",
  grades: [{ grade: "", classes: "", per: "", rounds: "1", inst: lead }], links: [], photos: [], updatedAt: "",
});

export default function ReportDialog({ lectureId, onClose }: { lectureId: string; onClose: () => void }) {
  const { data, update } = useStore();
  const l = data?.lectures.find((x) => x.id === lectureId);
  const existing = data?.reports?.find((r) => r.id === lectureId);
  const names = data && l ? instructorsOf(data, l).map((i) => i.name).join(", ") : "";
  const [d, setD] = useState<Report>(() => structuredClone(existing ?? { ...blank(lectureId, names), topic: l?.subject ?? "" }));
  const [err, setErr] = useState("");
  if (!data || !l) return null;
  const set = (p: Partial<Report>) => setD((x) => ({ ...x, ...p }));
  const setGrade = (i: number, p: Partial<Report["grades"][number]>) => set({ grades: d.grades.map((g, j) => (j === i ? { ...g, ...p } : g)) });
  const tot = d.grades.reduce((t, g) => ({ cl: t.cl + num(g.classes), st: t.st + num(g.classes) * num(g.per), rd: t.rd + num(g.classes) * num(g.rounds) }), { cl: 0, st: 0, rd: 0 });

  function save() {
    if (d.photos.join("").length > 2_500_000) return setErr("사진 용량이 너무 큽니다. 사진을 줄여 주세요.");
    const r: Report = {
      ...d,
      grades: d.grades.filter((g) => g.grade || g.classes || g.per || g.inst),
      links: d.links.filter((x) => safeUrl(x.url)).map((x) => ({ label: x.label.trim(), url: safeUrl(x.url) })),
      updatedAt: new Date().toISOString().slice(0, 10),
    };
    update((s) => ({ ...s, reports: [...(s.reports ?? []).filter((x) => x.id !== r.id), r] }));
    onClose();
  }
  function remove() {
    if (!confirm("이 보고서를 삭제할까요?")) return;
    update((s) => ({ ...s, reports: (s.reports ?? []).filter((x) => x.id !== lectureId) }));
    onClose();
  }
  const field = (label: string, v: string, on: (v: string) => void, ph = "", full = false) => (
    <label className={`label ${full ? "sm:col-span-2" : ""}`}>
      {label}
      <input className="input" placeholder={ph} value={v} onChange={(e) => on(e.target.value)} />
    </label>
  );

  return (
    <div className="fixed inset-0 z-[60] flex justify-center overflow-auto bg-black/50 p-3" onClick={onClose}>
      <div className="card my-auto h-fit w-full max-w-2xl" role="dialog" aria-label="강의 활동 보고서" onClick={(e) => e.stopPropagation()}>
        <h2 className="h2 mb-2">강의 활동 보고서</h2>
        <div className="mb-3 grid gap-0.5 rounded bg-bg px-3 py-2 text-sm text-muted">
          <b className="text-ink">{orgOf(data, l)?.name}</b>
          <span>{dateLabel(l.date)} · {[l.target, l.period].filter(Boolean).join(" · ")} · 강사 {names || "미배정"}</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {field("강의 주제", d.topic, (v) => set({ topic: v }), "예: 학교폭력 예방, 디지털 중독 예방", true)}
          {field("담당교사", d.teacher, (v) => set({ teacher: v }), "예: 홍OO 보건선생님")}
          {field("담당교사 연락처", d.teacherTel, (v) => set({ teacherTel: v }), "010-0000-0000")}
          {field("담당교사 이메일", d.teacherEmail, (v) => set({ teacherEmail: v }), "teacher@example.com", true)}
          <label className="label sm:col-span-2">
            강의 내용 (무엇을 어떻게 진행했는지)
            <textarea className="input" rows={5} placeholder="재출강 때 참고할 내용: 다룬 주제, 활동, 학생 반응 등" value={d.content} onChange={(e) => set({ content: e.target.value })} />
          </label>
          <label className="label sm:col-span-2">
            특이사항
            <textarea className="input" rows={3} value={d.notes} onChange={(e) => set({ notes: e.target.value })} />
          </label>
        </div>

        <h3 className="mt-4 mb-1 text-sm font-bold text-accent">학년·학급별 진행</h3>
        {d.grades.map((g, i) => (
          <div key={i} className="mb-1.5 flex flex-wrap items-center gap-1.5">
            <input className="input w-16" placeholder="학년" aria-label="학년" value={g.grade} onChange={(e) => setGrade(i, { grade: e.target.value })} />
            <input className="input w-20" placeholder="학급수" aria-label="학급수" inputMode="numeric" value={g.classes} onChange={(e) => setGrade(i, { classes: e.target.value })} />
            <input className="input w-24" placeholder="반 학생수" aria-label="반 학생수" inputMode="numeric" value={g.per} onChange={(e) => setGrade(i, { per: e.target.value })} />
            <input className="input w-16" placeholder="차시" aria-label="차시" inputMode="numeric" value={g.rounds} onChange={(e) => setGrade(i, { rounds: e.target.value })} />
            <span className="w-16 text-xs text-muted tabular-nums">총 {num(g.classes) * num(g.per)}명</span>
            <input className="input min-w-32 flex-1" placeholder="강사 (쉼표로 구분)" aria-label="강사" value={g.inst} onChange={(e) => setGrade(i, { inst: e.target.value })} />
            <button className="btn btn-sm text-bad" onClick={() => set({ grades: d.grades.filter((_, j) => j !== i) })}>삭제</button>
          </div>
        ))}
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn btn-sm" onClick={() => set({ grades: [...d.grades, { grade: "", classes: "", per: "", rounds: "1", inst: names }] })}>
            학년 줄 추가
          </button>
          <span className="text-xs text-muted">합계 · 학급 {tot.cl} · 총 학생 {tot.st}명 · 차시×학급 {tot.rd}</span>
        </div>

        <h3 className="mt-4 mb-1 text-sm font-bold text-accent">강의자료 링크 (파일 대신 링크로 남깁니다)</h3>
        {d.links.map((x, i) => (
          <div key={i} className="mb-1.5 flex gap-1.5">
            <input className="input w-40" placeholder="이름 (예: 3학년 자료)" value={x.label} onChange={(e) => set({ links: d.links.map((y, j) => (j === i ? { ...y, label: e.target.value } : y)) })} />
            <input className="input flex-1" placeholder="https://…" value={x.url} onChange={(e) => set({ links: d.links.map((y, j) => (j === i ? { ...y, url: e.target.value } : y)) })} />
            <button className="btn btn-sm text-bad" onClick={() => set({ links: d.links.filter((_, j) => j !== i) })}>삭제</button>
          </div>
        ))}
        <button className="btn btn-sm" onClick={() => set({ links: [...d.links, { label: "", url: "" }] })}>
          링크 추가
        </button>

        <h3 className="mt-4 mb-1 text-sm font-bold text-accent">활동사진 ({d.photos.length}/3)</h3>
        <p className="mb-1 text-xs text-warn">학생 얼굴이 알아볼 수 있게 나온 사진은 올리지 마세요. 판서·활동지·교실 모습 위주로 남겨 주세요.</p>
        <div className="flex flex-wrap gap-2">
          {d.photos.map((p, i) => (
            <div key={i} className="grid justify-items-start gap-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p} alt={`활동사진 ${i + 1}`} className="w-44 max-w-full rounded border border-line" />
              <button className="btn btn-sm text-bad" onClick={() => set({ photos: d.photos.filter((_, j) => j !== i) })}>
                삭제
              </button>
            </div>
          ))}
        </div>
        {d.photos.length < 3 && (
          <label className="btn btn-sm mt-2 cursor-pointer">
            사진 추가
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={async (e) => {
                const fs = Array.from(e.target.files ?? []).slice(0, 3 - d.photos.length);
                try {
                  const add = await Promise.all(fs.map(shrink));
                  set({ photos: [...d.photos, ...add] });
                } catch {
                  setErr("사진을 읽지 못했습니다. 다른 사진으로 시도해 주세요.");
                }
                e.target.value = "";
              }}
            />
          </label>
        )}

        <p className="mt-2 min-h-5 text-sm text-bad">{err}</p>
        <div className="mt-1 flex flex-wrap justify-between gap-2">
          <div>{existing && <button className="btn text-bad" onClick={remove}>보고서 삭제</button>}</div>
          <div className="flex gap-2">
            <button className="btn" onClick={onClose}>취소</button>
            <button className="btn btn-primary" onClick={save}>저장</button>
          </div>
        </div>
      </div>
    </div>
  );
}
