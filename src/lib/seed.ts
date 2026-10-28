import type { AppData, Curriculum, Instructor, Lecture, Org, StoredFile } from "./types";

// 저장소에 들어가는 데모 데이터입니다. 실제 강사·학교·계좌 정보를 넣지 마세요.
// 이름, 연락처, 계좌번호, 사업자번호는 모두 지어낸 값입니다.

const NAMES = [
  "김하늘", "이도담", "박새봄", "최가람", "정나래", "강이슬", "윤보라",
  "장한결", "임다솜", "한아름", "오누리", "서예린", "신바다", "권소담",
];

export const DEMO_INSTRUCTORS: Instructor[] = NAMES.map((name, i) => ({
  id: `ins-${i + 1}`,
  name,
  phone: `010-0000-${String(1001 + i)}`,
  email: `instructor${i + 1}@example.com`,
  birth: `198${i % 10}.0${(i % 9) + 1}.1${i % 10}`,
  address: "경기도 고양시 (데모 주소)",
  education: ["OO대학교 교육학과 졸업"],
  career: ["바움사회적협동조합 전문강사 (2022~현재)", "초·중학교 생명존중·성폭력예방교육 출강 다수"],
  certificates: i % 2 === 0 ? ["성교육 전문강사 자격"] : ["폭력예방교육 전문강사 자격"],
  bankName: ["농협", "국민", "신한", "우리"][i % 4],
  accountNumber: `000-0000-0000-${String(10 + i).padStart(2, "0")}`,
}));

export const DEMO_ORGS: Org[] = [
  { id: "org-1", name: "가람초등학교", area: "고양 일산동구", contactName: "김담당", contactEmail: "garam-school@example.com" },
  { id: "org-2", name: "한빛초등학교", area: "고양 덕양구", contactName: "이담당", contactEmail: "hanbit-school@example.com" },
  { id: "org-3", name: "새솔중학교", area: "파주 운정", contactName: "박담당", contactEmail: "saesol-middle@example.com" },
  { id: "org-4", name: "푸른숲초등학교", area: "고양 일산서구", contactName: "최담당", contactEmail: "" },
  { id: "org-5", name: "다온초등학교", area: "김포 한강신도시", contactName: "정담당", contactEmail: "daon-school@example.com" },
];

export const DEMO_CURRICULA: Curriculum[] = [
  {
    id: "cur-1",
    subject: "성폭력예방교육",
    label: "초등 3~4학년 · 2차시",
    purpose:
      "요즘 많은 초등학생들이 폭력적인 미디어와 자극적인 대중문화의 영향으로 사회적 문제를 일으키거나 그 피해자로 어려움을 당하고 있습니다. 이에 혐오와 차별 없는 행복한 학교를 위해 바른 지식과 가치관을 가질 수 있도록 하는 생활교육의 중요성이 대두되고 있습니다. 특히 초등학생이 사이버 폭력 위험에 쉽게 노출되고 있어 이에 대응하기 위해 학교에서는 바른 가치관 정립과 학교폭력 예방 교육 등 학교 생활교육의 필요를 충족하고자 이에 아래와 같은 목표로 생활교육을 진행하고자 합니다.",
    sessions: [
      {
        topics: [
          {
            theme: "나를 이해하고 소중하게",
            content: "1. 생명의 소중함\n# 생명은 소중한 선물\n# 나와 타인의 소중함을 인식하는 생명감수성 함양",
            remark: "성가치관",
          },
          {
            theme: "나를 지키고 행복하게",
            content: "2. 스마트폰 중독 예방교육\n# 음란물의 유해성 알아보기\n# 스마트폰이 뇌에 미치는 영향 알아보기\n# 건강한 뇌 발달을 위한 가이드",
            remark: "미디어 리터러시",
          },
        ],
        effects: "생명의 소중함을 바탕으로 자신과 타인을 존중하는 성가치관을 형성한다.\n미디어를 비판적으로 이해하고 건강한 디지털 생활습관을 실천한다.",
      },
      {
        topics: [
          {
            theme: "함께 즐겁고 행복하게",
            content: "3. 건강한 관계와 경계존중\n# 나와 친구의 경계 이해하기\n# 말과 행동의 존중 표현하기\n# 서로 배려하는 관계 만들기",
            remark: "경계존중교육",
          },
          {
            theme: "",
            content: "4. 경계존중 신호등 활동\n# 상황별 초록·노랑·빨강 구분하기\n# 신체접촉과 언어 사례 판단하기\n# 존중하는 선택 실천하기",
            remark: "경계존중활동",
          },
        ],
        effects: "타인의 경계를 존중하는 태도를 기른다.\n학교생활에서 안전하고 건강한 관계를 실천한다.",
      },
    ],
  },
];

function lec(
  id: string, date: string, orgId: string, target: string, sessions: number,
  leadIdx: number, others: number[], unitPrice: number | null,
  account: "corp" | "personal" = "corp", personalIdx?: number,
): Lecture {
  const org = DEMO_ORGS.find((o) => o.id === orgId)!;
  return {
    id, date, orgId, target,
    subject: "성폭력예방교육",
    place: `${org.name.replace("등학교", "")} 각 교실`,
    sessions,
    minutesPerSession: 40,
    leadId: `ins-${leadIdx}`,
    instructorIds: [leadIdx, ...others].map((n) => `ins-${n}`),
    unitPrice,
    account,
    personalAccountId: personalIdx ? `ins-${personalIdx}` : undefined,
    note: "",
    sendLogs: [],
  };
}

export const DEMO_LECTURES: Lecture[] = [
  lec("lec-1", "2026-11-04", "org-1", "3학년", 2, 1, [2, 3, 4], 50000),
  lec("lec-2", "2026-11-06", "org-2", "4학년", 2, 5, [6, 7], 50000, "personal", 6),
  lec("lec-3", "2026-11-11", "org-3", "1학년", 2, 8, [9, 10, 11, 12], 55000),
  lec("lec-4", "2026-11-13", "org-4", "3학년", 2, 13, [14], 50000),
  lec("lec-5", "2026-11-18", "org-5", "4학년", 2, 2, [3], null),
  lec("lec-6", "2026-10-21", "org-1", "4학년", 2, 1, [5, 9], 50000),
  lec("lec-7", "2026-12-02", "org-2", "3학년", 2, 4, [7, 10], 50000),
];

/** 브라우저에서 '샘플' 표시가 된 가짜 서류 이미지를 만듭니다. */
export function makePlaceholder(title: string, lines: string[]): StoredFile {
  const c = document.createElement("canvas");
  c.width = 1240;
  c.height = 1754;
  const g = c.getContext("2d")!;
  g.fillStyle = "#fff";
  g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = "#1b6a56";
  g.lineWidth = 6;
  g.strokeRect(60, 60, c.width - 120, c.height - 120);
  g.fillStyle = "#14231f";
  g.font = "bold 64px sans-serif";
  g.textAlign = "center";
  g.fillText(title, c.width / 2, 220);
  g.font = "36px sans-serif";
  g.textAlign = "left";
  lines.forEach((l, i) => g.fillText(l, 140, 380 + i * 70));
  g.save();
  g.translate(c.width / 2, c.height / 2 + 200);
  g.rotate(-Math.PI / 6);
  g.fillStyle = "rgba(179,38,30,0.18)";
  g.font = "bold 220px sans-serif";
  g.textAlign = "center";
  g.fillText("SAMPLE", 0, 0);
  g.restore();
  return { name: `${title}.png`, type: "image/png", dataUrl: c.toDataURL("image/png") };
}

export function demoData(): AppData {
  const instructors = DEMO_INSTRUCTORS.map((ins) => ({
    ...ins,
    accountCopy:
      ins.id === "ins-7" // 일부러 하나를 비워 두어 경고를 확인할 수 있게 함
        ? undefined
        : makePlaceholder(`통장사본_${ins.name}`, [
            `예금주: ${ins.name}`,
            `은행: ${ins.bankName}`,
            `계좌번호: ${ins.accountNumber}`,
            "데모용 가짜 서류입니다.",
          ]),
  }));
  return {
    version: 1,
    instructors,
    orgs: DEMO_ORGS,
    lectures: DEMO_LECTURES,
    curricula: DEMO_CURRICULA,
    settings: {
      company: {
        name: "바움사회적협동조합",
        bizNo: "000-00-00000",
        ceo: "홍길동",
        address: "경기도 고양시 (데모 주소)",
        phone: "031-000-0000",
        email: "office@example.com",
        bizType: "교육서비스업",
      },
      mail: {
        senderName: "바움사회적협동조합",
        cc: "",
        subjectTemplate: "[바움사회적협동조합] {기관명} {강의월} {과목명} 행정서류 송부",
        bodyTemplate:
          "{담당자}님 안녕하세요.\n바움사회적협동조합입니다.\n\n{강의일} {기관명} {대상} {과목명} 관련 행정서류를 첨부하여 보내드립니다.\n\n첨부: {파일목록}\n\n확인 부탁드리며, 문의 사항은 회신 주시면 안내드리겠습니다.\n감사합니다.\n\n바움사회적협동조합 드림",
      },
      corpBank: { bankName: "농협", accountNumber: "000-0000-0000-00", holder: "바움사회적협동조합" },
      businessRegistration: makePlaceholder("사업자등록증", [
        "상호: 바움사회적협동조합",
        "등록번호: 000-00-00000",
        "대표자: 홍길동",
        "데모용 가짜 서류입니다.",
      ]),
      corpAccountCopy: makePlaceholder("통장사본_법인", [
        "예금주: 바움사회적협동조합",
        "은행: 농협",
        "계좌번호: 000-0000-0000-00",
        "데모용 가짜 서류입니다.",
      ]),
    },
  };
}
