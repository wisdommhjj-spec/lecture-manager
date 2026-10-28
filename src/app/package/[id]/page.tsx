"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import type { AppData, Lecture, LessonPlan, SendLog } from "@/lib/types";
import {
  accountCopyOf, buildLessonPlan, checkPackage, dateLabel, feeTotal, fillTemplate, instructorsOf,
  orgOf, packageFiles, won, zipNameOf,
} from "@/lib/package";
import { buildZip, download } from "@/lib/zip";
import { FilePreview } from "@/components/Files";

// 발송 결과와 이력에는 주소 일부를 가립니다 (화면 캡처·데모 영상에 주소가 드러나지 않게)
const maskEmail = (s: string) => s.replace(/([^\s,@]{2})[^\s,@]*@/g, "$1***@");

interface MailStatus {
  configured: boolean;
  testMode: boolean;
  testRecipient: string;
  needsPasscode: boolean;
}

export default function PackagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data } = useStore();
  if (!data) return <p className="muted">불러오는 중…</p>;
  const l = data.lectures.find((x) => x.id === id);
  if (!l)
    return (
      <div className="card text-center">
        일정을 찾을 수 없습니다. <Link className="text-accent underline" href="/schedule">일정으로 돌아가기</Link>
      </div>
    );
  return <Package key={l.id} data={data} l={l} />;
}

function Package({ data, l }: { data: AppData; l: Lecture }) {
  const { update } = useStore();
  const org = orgOf(data, l);
  const [plan, setPlan] = useState<LessonPlan>(() => buildLessonPlan(data, l));
  const files = packageFiles(data, l);
  const zipName = zipNameOf(l, org);
  const [to, setTo] = useState(org?.contactEmail ?? "");
  const [cc, setCc] = useState(data.settings.mail.cc);
  const [subject, setSubject] = useState(() => fillTemplate(data.settings.mail.subjectTemplate, data, l, files.map((f) => f.fileName)));
  const [body, setBody] = useState(() => fillTemplate(data.settings.mail.bodyTemplate, data, l, [zipName]));
  const [tab, setTab] = useState(0);
  const [checked, setChecked] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [mail, setMail] = useState<MailStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/send")
      .then((r) => r.json())
      .then(setMail)
      .catch(() => setMail({ configured: false, testMode: false, testRecipient: "", needsPasscode: false }));
  }, []);

  const warnings = useMemo(() => checkPackage(data, l, plan, to), [data, l, plan, to]);
  const blocked = warnings.length > 0 || !checked;

  function log(entry: SendLog) {
    update((d) => ({ ...d, lectures: d.lectures.map((x) => (x.id === l.id ? { ...x, sendLogs: [...x.sendLogs, entry] } : x)) }));
  }

  async function accept(send: boolean) {
    setBusy(true);
    setResult(null);
    try {
      const z = await buildZip(data, l, plan);
      download(z.blob, zipName);
      if (!send) {
        setResult({ ok: true, text: `${zipName} 을(를) 내려받았습니다. (메일은 보내지 않았습니다)` });
        return;
      }
      const r = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, cc, subject, body, senderName: data.settings.mail.senderName, zipName, zipBase64: z.base64, passcode }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "메일을 보내지 못했습니다.");
      log({ at: new Date().toISOString(), to: j.to, cc: j.cc ?? "", zipName, files: z.names, testMode: j.testMode });
      setResult({ ok: true, text: `${maskEmail(j.to)} 로 메일을 보냈습니다${j.testMode ? " (테스트 모드)" : ""}. zip은 내 컴퓨터에도 저장했습니다.` });
      setChecked(false);
    } catch (e) {
      setResult({ ok: false, text: e instanceof Error ? e.message : "처리하지 못했습니다." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <Link href="/documents" className="text-xs text-muted hover:text-accent">
            ← 행정서류
          </Link>
          <h1 className="h1">서류 패키지 · 최종 확인</h1>
          <p className="muted">
            {org?.name} · {dateLabel(l.date)} · {l.target} · {l.subject} {l.sessions}차시 · 강사 {l.instructorIds.length}명 · {won(feeTotal(l))}
          </p>
        </div>
        <Link className="btn" href={`/schedule?edit=${l.id}`}>
          일정 정보 수정하기
        </Link>
      </div>

      {/* 1. 점검 결과 */}
      <section className={`card ${warnings.length ? "border-warn bg-warn-soft" : "border-ok bg-ok-soft"}`}>
        {warnings.length ? (
          <>
            <h2 className="h2 text-warn">확인이 필요한 항목 {warnings.length}개 — 해결해야 보낼 수 있습니다</h2>
            <ul className="mt-1 grid gap-1">
              {warnings.map((w) => (
                <li key={w.text} className="flex flex-wrap items-center gap-2">
                  <span>⚠ {w.text}</span>
                  {w.fixHref && (
                    <Link className="btn btn-sm" href={w.fixHref}>
                      고치러 가기
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <h2 className="h2 text-ok">✓ 서류 5종이 모두 준비되었습니다</h2>
        )}
      </section>

      {/* 2. 서류 미리보기 */}
      <section className="card grid gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="h2">서류 미리보기</h2>
          <span className="text-xs text-muted">
            묶음 파일 이름: <b className="text-ink">{zipName}</b>
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5" role="tablist">
          {files.map((f, i) => (
            <button
              key={f.kind}
              role="tab"
              aria-selected={tab === i}
              onClick={() => setTab(i)}
              className={`rounded-md border px-3 py-1.5 text-sm ${tab === i ? "border-accent bg-accent-soft font-bold text-accent" : "border-line"}`}
            >
              {f.ready ? "✓" : "⚠"} {f.label}
            </button>
          ))}
        </div>
        <div className="text-xs text-muted">파일: {files[tab].fileName}</div>
        <div className="overflow-x-auto rounded-md border border-line bg-white p-4 text-[#14231f] sm:p-6">
          {files[tab].kind === "card" && <CardPreview data={data} l={l} />}
          {files[tab].kind === "quote" && <QuotePreview data={data} l={l} />}
          {(files[tab].kind === "bizreg" || files[tab].kind === "account") &&
            (files[tab].source ? (
              <FilePreview file={files[tab].source!} />
            ) : (
              <p className="text-center">
                파일이 없습니다.{" "}
                <Link className="underline" href="/vault">
                  보관함에서 올리기
                </Link>
              </p>
            ))}
          {files[tab].kind === "plan" && <PlanEditor plan={plan} setPlan={setPlan} company={data.settings.company.name} />}
        </div>
      </section>

      {/* 3. 메일 */}
      <section className="card grid gap-3">
        <h2 className="h2">보낼 메일</h2>
        {mail?.testMode && (
          <p className="rounded-md bg-warn-soft px-3 py-2 text-sm text-warn">
            테스트 모드입니다. 받는 사람과 상관없이 <b>{mail.testRecipient}</b> 로만 보내고, 참조는 보내지 않습니다.
          </p>
        )}
        {mail && !mail.configured && (
          <p className="rounded-md bg-bad-soft px-3 py-2 text-sm text-bad">메일 계정이 설정되지 않아 보낼 수 없습니다. zip 내려받기만 할 수 있습니다.</p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="label">
            받는 사람 ({org?.contactName || "기관 담당자"})
            <input className="input text-base font-bold" value={to} onChange={(e) => setTo(e.target.value)} placeholder="담당자 이메일" />
          </label>
          <label className="label">
            참조
            <input className="input" value={cc} onChange={(e) => setCc(e.target.value)} placeholder="예: 바움 대표 메일" />
          </label>
          <label className="label sm:col-span-2">
            제목
            <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </label>
          <label className="label sm:col-span-2">
            본문
            <textarea className="input" rows={9} value={body} onChange={(e) => setBody(e.target.value)} />
          </label>
        </div>
        <p className="text-xs text-muted">첨부: {zipName} (서류 5종)</p>
      </section>

      {/* 4. 수락 */}
      <section className="card grid gap-3 border-accent">
        <label className="flex items-start gap-2">
          <input type="checkbox" className="mt-1 size-4" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
          <span>
            서류 5종의 내용(기관명, 날짜, 강사, 금액, 계좌)과 받는 사람 <b>{to || "(없음)"}</b> 을(를) 모두 확인했습니다.
          </span>
        </label>
        {mail?.needsPasscode && (
          <label className="label max-w-xs">
            발송 암호
            <input className="input" type="password" value={passcode} onChange={(e) => setPasscode(e.target.value)} />
          </label>
        )}
        <div className="flex flex-wrap gap-2">
          <Link className="btn" href={`/schedule?edit=${l.id}`}>
            수정하기
          </Link>
          <button className="btn" disabled={blocked || busy} onClick={() => accept(false)}>
            수락하고 zip만 내려받기
          </button>
          <button className="btn btn-primary" disabled={blocked || busy || !mail?.configured} onClick={() => accept(true)}>
            {busy ? "처리 중…" : "수락하고 보내기"}
          </button>
        </div>
        {blocked && !busy && (
          <p className="text-xs text-muted">{warnings.length ? "위의 확인 항목을 먼저 해결하세요." : "확인 체크를 해야 수락할 수 있습니다."}</p>
        )}
        {result && <p className={`rounded-md px-3 py-2 text-sm ${result.ok ? "bg-ok-soft text-ok" : "bg-bad-soft text-bad"}`}>{result.text}</p>}
      </section>

      {/* 5. 발송 이력 */}
      {l.sendLogs.length > 0 && (
        <section className="card">
          <h2 className="h2 mb-2">발송 이력</h2>
          <table className="tbl">
            <thead>
              <tr>
                <th>보낸 시각</th>
                <th>받는 사람</th>
                <th>첨부</th>
              </tr>
            </thead>
            <tbody>
              {[...l.sendLogs].reverse().map((s) => (
                <tr key={s.at}>
                  <td className="whitespace-nowrap">{new Date(s.at).toLocaleString("ko-KR")}</td>
                  <td>
                    {maskEmail(s.to)}
                    {s.cc && <small className="block text-muted">참조 {maskEmail(s.cc)}</small>}
                    {s.testMode && <span className="chip chip-warn ml-1">테스트</span>}
                  </td>
                  <td>
                    {s.zipName}
                    <small className="block text-muted">{s.files.join(", ")}</small>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

/* ---------- 미리보기 (내려받는 워드 파일과 같은 내용) ---------- */

const td = "border border-[#333] px-2 py-1.5 align-middle";
const th = `${td} bg-[#e8f1ee] font-bold text-center whitespace-nowrap`;

function DocTitle({ children }: { children: string }) {
  return <h3 className="mb-4 text-center text-2xl font-bold tracking-widest underline underline-offset-8">{children}</h3>;
}

function CardPreview({ data, l }: { data: AppData; l: Lecture }) {
  const org = orgOf(data, l);
  return (
    <div className="grid gap-8">
      {instructorsOf(data, l).map((i) => (
        <div key={i.id} className="mx-auto w-full max-w-2xl">
          <DocTitle>강 사 카 드</DocTitle>
          <table className="w-full border-collapse text-sm">
            <tbody>
              <tr>
                <th className={th}>성명</th>
                <td className={td}>{i.name}</td>
                <th className={th}>역할</th>
                <td className={td}>{i.id === l.leadId ? "대표 강사" : "강사"}</td>
              </tr>
              <tr>
                <th className={th}>생년월일</th>
                <td className={td}>{i.birth}</td>
                <th className={th}>연락처</th>
                <td className={td}>{i.phone}</td>
              </tr>
              {[
                ["이메일", i.email],
                ["주소", i.address],
                ["학력", i.education.join("\n")],
                ["주요 경력", i.career.join("\n")],
                ["자격", i.certificates.join("\n")],
              ].map(([k, v]) => (
                <tr key={k}>
                  <th className={th}>{k}</th>
                  <td className={`${td} whitespace-pre-line`} colSpan={3}>
                    {v || "-"}
                  </td>
                </tr>
              ))}
              <tr>
                <th className={th}>출강 기관</th>
                <td className={td}>{org?.name}</td>
                <th className={th}>교육일</th>
                <td className={td}>{dateLabel(l.date)}</td>
              </tr>
              <tr>
                <th className={th}>교육 내용</th>
                <td className={td} colSpan={3}>
                  {l.subject} ({l.target}, {l.sessions}차시)
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

function QuotePreview({ data, l }: { data: AppData; l: Lecture }) {
  const c = data.settings.company;
  const org = orgOf(data, l);
  const n = l.instructorIds.length;
  const total = feeTotal(l);
  const acct = accountCopyOf(data, l);
  return (
    <div className="mx-auto w-full max-w-2xl text-sm">
      <DocTitle>견 적 서</DocTitle>
      <table className="w-full border-collapse">
        <tbody>
          <tr>
            <td className={`${td} w-[42%]`} rowSpan={5}>
              <b className="text-base">{org?.name} 귀하</b>
              <br />
              <br />
              견적일: {new Date().toLocaleDateString("ko-KR")}
              <br />
              아래와 같이 견적합니다.
            </td>
            <th className={th} rowSpan={5}>
              공급자
            </th>
            <th className={th}>등록번호</th>
            <td className={td}>{c.bizNo}</td>
          </tr>
          {[
            ["상호", c.name],
            ["대표자", c.ceo],
            ["주소", c.address],
            ["연락처", c.phone],
          ].map(([k, v]) => (
            <tr key={k}>
              <th className={th}>{k}</th>
              <td className={td}>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <table className="mt-3 w-full border-collapse">
        <tbody>
          <tr>
            <th className={th}>합계 금액</th>
            <td className={`${td} font-bold`}>{won(total)} (부가가치세 면세)</td>
          </tr>
        </tbody>
      </table>
      <table className="mt-3 w-full border-collapse">
        <thead>
          <tr>
            {["품명", "규격", "수량", "단가", "금액"].map((h) => (
              <th key={h} className={th}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="text-center">
            <td className={td}>{l.subject} 강사료</td>
            <td className={td}>
              {l.target} · {l.sessions}차시 × {n}명
            </td>
            <td className={td}>{n * l.sessions}</td>
            <td className={td}>{won(l.unitPrice)}</td>
            <td className={td}>{won(total)}</td>
          </tr>
        </tbody>
      </table>
      <p className="mt-3">
        교육일: {dateLabel(l.date)} / 장소: {l.place}
      </p>
      <p>
        입금 계좌:{" "}
        {l.account === "corp"
          ? `${data.settings.corpBank.bankName} ${data.settings.corpBank.accountNumber} (${data.settings.corpBank.holder})`
          : `강사 개인계좌 (${acct.owner})`}
      </p>
    </div>
  );
}

function PlanEditor({ plan, setPlan, company }: { plan: LessonPlan; setPlan: (p: LessonPlan) => void; company: string }) {
  const ed = "w-full resize-y rounded border border-dashed border-[#9bb] bg-[#fbfdfc] px-1.5 py-1 text-[#14231f]";
  const setField = (k: keyof LessonPlan, v: string) => setPlan({ ...plan, [k]: v });
  const setTopic = (si: number, ti: number, k: "theme" | "content" | "remark", v: string) =>
    setPlan({
      ...plan,
      sessions: plan.sessions.map((s, i) => (i !== si ? s : { ...s, topics: s.topics.map((t, j) => (j !== ti ? t : { ...t, [k]: v })) })),
    });
  const setEffects = (si: number, v: string) => setPlan({ ...plan, sessions: plan.sessions.map((s, i) => (i !== si ? s : { ...s, effects: v })) });
  const rows = (s: string) => Math.max(2, s.split("\n").length);
  return (
    <div className="mx-auto w-full max-w-3xl text-sm">
      <p className="mb-3 rounded bg-[#fcebc9] px-2 py-1 text-xs text-[#8f5200]">점선 칸은 여기서 바로 고칠 수 있습니다. 고친 내용이 그대로 강의계획서 파일에 들어갑니다.</p>
      <DocTitle>강의 계획서</DocTitle>
      <b>[{plan.schoolYear}]</b>
      <table className="mt-1 w-full border-collapse">
        <tbody>
          <tr>
            <th className={th}>과목명</th>
            <td className={td}>{plan.subject}</td>
            <th className={th}>장소</th>
            <td className={td}>
              <input className={ed} value={plan.place} onChange={(e) => setField("place", e.target.value)} />
            </td>
          </tr>
          <tr>
            <th className={th}>담당 강사</th>
            <td className={td}>
              <input className={ed} value={plan.instructorsText} onChange={(e) => setField("instructorsText", e.target.value)} />
            </td>
            <th className={th}>대상</th>
            <td className={td}>{plan.target}</td>
          </tr>
          <tr>
            <th className={th}>대표 강사 연락처</th>
            <td className={td}>{plan.leadPhone}</td>
            <th className={th}>교육시간</th>
            <td className={td}>{plan.totalTime}</td>
          </tr>
        </tbody>
      </table>
      <h4 className="mt-4 mb-1 font-bold">ρ교육 목적</h4>
      <textarea className={ed} rows={5} value={plan.purpose} onChange={(e) => setField("purpose", e.target.value)} />
      {plan.sessions.map((s, si) => (
        <div key={si} className="mt-4">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={`${th} w-[12%]`}>차시</th>
                <th className={`${th} w-[20%]`}>교육주제</th>
                <th className={th}>교육내용</th>
                <th className={`${th} w-[18%]`}>비고</th>
              </tr>
            </thead>
            <tbody>
              {s.topics.map((t, ti) => (
                <tr key={ti}>
                  {ti === 0 && (
                    <td className={`${td} text-center whitespace-pre-line`} rowSpan={s.topics.length}>
                      {s.label}
                    </td>
                  )}
                  <td className={td}>
                    <textarea className={ed} rows={2} value={t.theme} onChange={(e) => setTopic(si, ti, "theme", e.target.value)} />
                  </td>
                  <td className={td}>
                    <textarea className={ed} rows={rows(t.content)} value={t.content} onChange={(e) => setTopic(si, ti, "content", e.target.value)} />
                  </td>
                  <td className={td}>
                    <input className={ed} value={t.remark} onChange={(e) => setTopic(si, ti, "remark", e.target.value)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <h4 className="mt-2 mb-1 font-bold">ρ기대효과</h4>
          <textarea className={ed} rows={rows(s.effects)} value={s.effects} onChange={(e) => setEffects(si, e.target.value)} />
        </div>
      ))}
      <p className="mt-4 text-center font-bold">{company}</p>
    </div>
  );
}
