"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { get, set } from "idb-keyval";
import type { AppData } from "./types";
import { demoData } from "./seed";

// 지금은 데이터를 브라우저(IndexedDB)에 저장합니다. 실사용 단계에서 Supabase로 바꿉니다.
const KEY = "chulgang-manager:data";

interface Store {
  data: AppData | null;
  update: (fn: (d: AppData) => AppData) => void;
  resetDemo: () => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData | null>(null);
  const loaded = useRef(false);

  useEffect(() => {
    get<AppData>(KEY)
      .then((d) => setData(d ?? demoData()))
      .catch(() => setData(demoData()))
      .finally(() => {
        loaded.current = true;
      });
  }, []);

  useEffect(() => {
    if (loaded.current && data) set(KEY, data).catch(() => {});
  }, [data]);

  const update = useCallback((fn: (d: AppData) => AppData) => {
    setData((d) => (d ? fn(d) : d));
  }, []);

  const resetDemo = useCallback(() => setData(demoData()), []);

  return <Ctx.Provider value={{ data, update, resetDemo }}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("StoreProvider 밖에서 useStore를 썼습니다");
  return s;
}

export const uid = (p: string) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
