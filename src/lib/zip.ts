import JSZip from "jszip";
import type { AppData, Lecture, LessonPlan } from "./types";
import { instructorCardsDocx, lessonPlanDocx, quoteDocx } from "./docs";
import { packageFiles } from "./package";

const b64 = (dataUrl: string) => dataUrl.slice(dataUrl.indexOf(",") + 1);

/** 서류 5종을 만들어 zip 하나로 묶습니다. */
export async function buildZip(data: AppData, l: Lecture, plan: LessonPlan) {
  const zip = new JSZip();
  const files = packageFiles(data, l);
  for (const f of files) {
    if (f.kind === "card") zip.file(f.fileName, await instructorCardsDocx(data, l));
    else if (f.kind === "quote") zip.file(f.fileName, await quoteDocx(data, l));
    else if (f.kind === "plan") zip.file(f.fileName, await lessonPlanDocx(plan, data));
    else if (f.source) zip.file(f.fileName, b64(f.source.dataUrl), { base64: true });
  }
  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
  const base64 = await zip.generateAsync({ type: "base64", compression: "DEFLATE" });
  return { blob, base64, names: files.map((f) => f.fileName) };
}

export function download(blob: Blob, name: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
