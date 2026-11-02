"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { useStore } from "@/lib/store";
import type { Lecture } from "@/lib/types";
import LectureEditor, { blankLecture } from "./LectureEditor";

/**
 * 어느 화면에서든 학교(기관)명을 누르면 같은 '출강 일정 수정' 팝업이 뜨도록 하는 공용 장치입니다.
 * edit(일정ID)로 열고, create(날짜)로 새 일정을 만듭니다.
 */
interface Ctl {
  edit: (id: string) => void;
  create: (date?: string) => void;
}
const Ctx = createContext<Ctl | null>(null);

export function LectureEditorProvider({ children }: { children: React.ReactNode }) {
  const { data, update } = useStore();
  const [cur, setCur] = useState<{ l: Lecture; isNew: boolean } | null>(null);

  const edit = useCallback(
    (id: string) => {
      const l = data?.lectures.find((x) => x.id === id);
      if (l) setCur({ l, isNew: false });
    },
    [data],
  );
  const create = useCallback((date?: string) => data && setCur({ l: blankLecture(data, date), isNew: true }), [data]);

  const close = () => setCur(null);
  return (
    <Ctx.Provider value={{ edit, create }}>
      {children}
      {data && cur && (
        <LectureEditor
          key={cur.l.id}
          data={data}
          initial={cur.l}
          isNew={cur.isNew}
          onClose={close}
          onSave={(l) => {
            update((d) => ({
              ...d,
              lectures: d.lectures.some((x) => x.id === l.id) ? d.lectures.map((x) => (x.id === l.id ? l : x)) : [...d.lectures, l],
            }));
            close();
          }}
          onDelete={() => {
            update((d) => ({ ...d, lectures: d.lectures.filter((x) => x.id !== cur.l.id) }));
            close();
          }}
        />
      )}
    </Ctx.Provider>
  );
}

export function useLectureEditor() {
  const c = useContext(Ctx);
  if (!c) throw new Error("LectureEditorProvider 밖에서 useLectureEditor를 썼습니다");
  return c;
}

/** 학교(기관)명 버튼: 누르면 수정 팝업 */
export function OrgButton({ id, children, className = "" }: { id: string; children: React.ReactNode; className?: string }) {
  const { edit } = useLectureEditor();
  return (
    <button type="button" onClick={() => edit(id)} title="눌러서 세부내용 수정" className={`text-left font-bold text-ink underline decoration-line decoration-dotted underline-offset-4 hover:text-accent hover:decoration-accent ${className}`}>
      {children}
    </button>
  );
}
