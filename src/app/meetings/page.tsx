import PageHead from "@/components/PageHead";

const PLANNED = [
  ["정기회의 안건", "회의 날짜별로 안건과 결정 사항을 기록하고, 다음 회의로 넘길 일을 표시합니다."],
  ["출강 일정 출력", "회의 자료로 쓸 다음 달 출강 일정표를 한 장으로 출력합니다."],
  ["업무 할 일", "서류 발송, 정산, 강사 연락 같은 할 일을 담당자별로 나눠 관리합니다."],
  ["강의 활동 보고서", "강사가 출강 후 강의 내용과 활동 사진을 올리고, 기관별로 모아 봅니다."],
];

export default function Meetings() {
  return (
    <div className="grid gap-4">
      <PageHead title="회의록·업무" desc="다음 단계에서 기존 '바움 출강 관리'의 기능을 옮겨 옵니다." />
      <div className="grid gap-3 md:grid-cols-2">
        {PLANNED.map(([t, d]) => (
          <div key={t} className="card">
            <div className="flex items-center justify-between">
              <b>{t}</b>
              <span className="chip">준비 중</span>
            </div>
            <p className="mt-1 text-sm text-muted">{d}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
