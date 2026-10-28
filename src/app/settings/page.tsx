"use client";

import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import type { AppData, Settings } from "@/lib/types";
import { download } from "@/lib/zip";

export default function SettingsPage() {
  const { data, update } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [mail, setMail] = useState<{ configured: boolean; testMode: boolean; testRecipient: string } | null>(null);
  const [code, setCode] = useState("");
  const [check, setCheck] = useState<{ ok?: boolean; login?: string; user?: string; issues?: string[]; error?: string } | null>(null);
  async function runCheck() {
    setCheck({ login: "점검 중…" });
    try {
      const r = await fetch("/api/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ check: true, passcode: code }) });
      setCheck(await r.json());
    } catch {
      setCheck({ error: "서버에 연결하지 못했습니다." });
    }
  }
  useEffect(() => {
    fetch("/api/send").then((r) => r.json()).then(setMail).catch(() => {});
  }, []);
  if (!data) return <p className="muted">불러오는 중…</p>;
  const s = data.settings;

  const set = <K extends keyof Settings>(group: K, patch: Partial<Settings[K]>) =>
    update((d) => ({ ...d, settings: { ...d.settings, [group]: { ...(d.settings[group] as object), ...patch } } }));

  const field = <K extends "company" | "mail" | "corpBank">(group: K, key: keyof Settings[K] & string, label: string) => (
    <label className="label">
      {label}
      <input className="input" value={String((s[group] as Record<string, string>)[key] ?? "")} onChange={(e) => set(group, { [key]: e.target.value } as Partial<Settings[K]>)} />
    </label>
  );

  function restore(f?: File) {
    if (!f) return;
    f.text().then((t) => {
      try {
        const d = JSON.parse(t) as AppData;
        if (!Array.isArray(d.lectures) || !d.settings) throw new Error();
        if (confirm("백업 파일로 지금 데이터를 모두 바꿀까요?")) update(() => d);
      } catch {
        alert("출강매니저 백업 파일이 아닙니다.");
      }
    });
  }

  return (
    <div className="grid gap-4">
      <h1 className="h1">설정</h1>
      <p className="muted">담당자가 바뀌어도 코드를 고치지 않고 여기서 바꿀 수 있습니다.</p>

      <section className="card grid gap-3">
        <h2 className="h2">메일 발송</h2>
        <p className="text-sm">
          발송 계정 상태:{" "}
          {!mail ? "확인 중…" : mail.configured ? <span className="chip chip-ok">연결됨</span> : <span className="chip chip-warn">설정 안 됨</span>}{" "}
          {mail?.testMode && <span className="chip chip-warn">테스트 모드 · {mail.testRecipient} 로만 발송</span>}
        </p>
        <p className="text-xs text-muted">
          보내는 메일 계정과 비밀번호는 보안을 위해 화면이 아니라 서버 설정(환경 변수 GMAIL_USER, GMAIL_APP_PASSWORD)에서 바꿉니다. 바움 대표 메일로 바꿀 때는 README의 &quot;메일 계정 바꾸기&quot;를 따라 하세요.
        </p>
        <div className="flex flex-wrap items-end gap-2 rounded border border-line bg-bg p-3">
          <label className="label">
            발송 암호
            <input className="input w-48" type="password" value={code} onChange={(e) => setCode(e.target.value)} />
          </label>
          <button className="btn" onClick={runCheck}>
            메일 설정 점검
          </button>
          {check && (
            <div className="basis-full text-sm">
              {check.error ? (
                <span className="text-bad">{check.error}</span>
              ) : (
                <>
                  <div>
                    Gmail 로그인: <b className={check.ok ? "text-ok" : check.login === "점검 중…" ? "" : "text-bad"}>{check.login}</b> {check.user && <span className="text-muted">({check.user})</span>}
                  </div>
                  {check.issues?.map((t) => (
                    <div key={t} className="text-bad">
                      ⚠ {t}
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {field("mail", "senderName", "보내는 사람 이름")}
          {field("mail", "cc", "기본 참조 메일 (쉼표로 여러 개)")}
          <label className="label sm:col-span-2">
            제목 틀
            <input className="input" value={s.mail.subjectTemplate} onChange={(e) => set("mail", { subjectTemplate: e.target.value })} />
          </label>
          <label className="label sm:col-span-2">
            본문 틀
            <textarea className="input" rows={8} value={s.mail.bodyTemplate} onChange={(e) => set("mail", { bodyTemplate: e.target.value })} />
          </label>
        </div>
        <p className="text-xs text-muted">쓸 수 있는 칸: {"{기관명} {담당자} {강의일} {강의월} {대상} {과목명} {파일목록}"}</p>
      </section>

      <section className="card grid gap-3">
        <h2 className="h2">공급자 정보 (견적서)</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {field("company", "name", "상호")}
          {field("company", "bizNo", "사업자등록번호")}
          {field("company", "ceo", "대표자")}
          {field("company", "phone", "연락처")}
          {field("company", "address", "주소")}
          {field("company", "bizType", "업태")}
        </div>
      </section>

      <section className="card grid gap-3">
        <h2 className="h2">법인 입금 계좌</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {field("corpBank", "bankName", "은행")}
          {field("corpBank", "accountNumber", "계좌번호")}
          {field("corpBank", "holder", "예금주")}
        </div>
      </section>

      <section className="card grid gap-2">
        <h2 className="h2">백업</h2>
        <p className="text-xs text-muted">지금은 데이터가 이 브라우저에만 저장됩니다. 다른 컴퓨터로 옮기거나 담당자에게 넘길 때 백업 파일을 쓰세요.</p>
        <div className="flex flex-wrap gap-2">
          <button
            className="btn"
            onClick={() => download(new Blob([JSON.stringify(data, null, 1)], { type: "application/json" }), `출강매니저_백업_${new Date().toISOString().slice(0, 10)}.json`)}
          >
            백업 내려받기
          </button>
          <button className="btn" onClick={() => fileRef.current?.click()}>
            백업에서 복원
          </button>
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => restore(e.target.files?.[0])} />
        </div>
      </section>
    </div>
  );
}
