"use client";

import { useRef } from "react";

/** 인쇄용 HTML을 화면 안에서 미리 보고, '인쇄 / PDF 저장'으로 출력합니다. */
export default function PrintPreview({ html, height = 560 }: { html: string; height?: number }) {
  const ref = useRef<HTMLIFrameElement>(null);
  return (
    <div className="grid gap-2">
      <div className="flex justify-end">
        <button className="btn btn-primary" onClick={() => ref.current?.contentWindow?.print()}>
          인쇄 / PDF 저장
        </button>
      </div>
      <iframe ref={ref} title="미리보기" srcDoc={html} className="w-full rounded border border-line bg-white" style={{ height }} />
    </div>
  );
}
