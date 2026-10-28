import Link from "next/link";

/** 화면 제목과 행정서류 아래 탭(발송 현황 / 서류 보관함) */
export default function PageHead({ title, desc, right }: { title: string; desc?: string; right?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-2">
      <div>
        <h1 className="h1">{title}</h1>
        {desc && <p className="text-sm text-muted">{desc}</p>}
      </div>
      {right}
    </div>
  );
}

export function DocTabs({ on }: { on: "status" | "vault" }) {
  const tab = (href: string, label: string, active: boolean) => (
    <Link href={href} className={`border-b-2 px-3 py-2 text-sm ${active ? "border-accent font-bold text-accent" : "border-transparent text-muted hover:text-ink"}`}>
      {label}
    </Link>
  );
  return (
    <div className="flex gap-1 border-b border-line">
      {tab("/documents", "발송 현황", on === "status")}
      {tab("/vault", "서류 보관함", on === "vault")}
    </div>
  );
}
