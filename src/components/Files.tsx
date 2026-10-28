"use client";

import { useRef, useState } from "react";
import type { StoredFile } from "@/lib/types";

// 메일 첨부 한도를 생각해 파일 하나는 3MB까지만 받습니다.
const MAX = 3 * 1024 * 1024;

export function FilePreview({ file, className = "" }: { file: StoredFile; className?: string }) {
  if (file.type === "application/pdf")
    return <object data={file.dataUrl} type="application/pdf" className={`h-[640px] w-full ${className}`} aria-label={file.name} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={file.dataUrl} alt={file.name} className={`mx-auto max-h-[640px] border ${className}`} />;
}

export function FileUpload({ value, onChange, label }: { value?: StoredFile; onChange: (f?: StoredFile) => void; label: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [err, setErr] = useState("");
  function pick(f?: File) {
    setErr("");
    if (!f) return;
    if (f.size > MAX) return setErr("3MB보다 큰 파일은 올릴 수 없습니다. 사진을 줄여서 다시 올려 주세요.");
    if (!/^image\/|application\/pdf/.test(f.type)) return setErr("이미지(JPG, PNG)나 PDF만 올릴 수 있습니다.");
    const r = new FileReader();
    r.onload = () => onChange({ name: f.name, type: f.type, dataUrl: String(r.result) });
    r.readAsDataURL(f);
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className={`chip ${value ? "chip-ok" : "chip-warn"}`}>{value ? `✓ ${value.name}` : "파일 없음"}</span>
      <button className="btn btn-sm" onClick={() => ref.current?.click()}>
        {value ? "바꾸기" : "올리기"}
      </button>
      {value && (
        <button className="btn btn-sm text-bad" onClick={() => confirm(`${label} 파일을 지울까요?`) && onChange(undefined)}>
          지우기
        </button>
      )}
      <input ref={ref} type="file" hidden accept="image/*,application/pdf" onChange={(e) => pick(e.target.files?.[0] ?? undefined)} />
      {err && <span className="text-xs text-bad">{err}</span>}
    </div>
  );
}
