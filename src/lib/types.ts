export type AccountKind = "corp" | "personal";

export interface StoredFile {
  name: string;
  type: string;
  dataUrl: string;
}

export interface Instructor {
  id: string;
  name: string;
  phone: string;
  email: string;
  birth: string; // 생년월일 (예: 1980.01.01)
  address: string;
  education: string[]; // 학력
  career: string[]; // 주요 경력
  certificates: string[]; // 자격
  bankName: string;
  accountNumber: string;
  accountCopy?: StoredFile; // 개인 통장사본
}

export interface Org {
  id: string;
  name: string;
  area: string;
  contactName: string;
  contactEmail: string;
}

export interface SendLog {
  at: string; // ISO
  to: string;
  cc: string;
  zipName: string;
  files: string[];
  testMode: boolean;
}

export interface Lecture {
  id: string;
  date: string; // yyyy-mm-dd
  orgId: string;
  target: string; // 대상 (예: 3학년)
  subject: string; // 과목명 (예: 성폭력예방교육)
  place: string; // 장소
  sessions: number; // 차시 수
  minutesPerSession: number;
  area?: string; // 지역·구 (비우면 기관의 지역)
  source?: string; // 사업·의뢰처
  period?: string; // 몇 교시·시간 (예: 3~4교시 10:00~11:20)
  leadId: string;
  instructorIds: string[];
  unitPrice: number | null; // 강사 1인 1차시 단가
  account: AccountKind;
  personalAccountId?: string; // 개인계좌 요청 시 대상 강사
  note: string;
  sendLogs: SendLog[];
  /** 정산: 강사별 차시 수(없으면 lecture.sessions). 키는 강사 id */
  units?: Record<string, number>;
  invoiceDate?: string; // 계산서 발행일 yyyy-mm-dd
  depositDate?: string; // 기관 입금일
  payouts?: Record<string, string>; // 법인계좌: 조합이 강사에게 지급한 날 (강사 id → 날짜)
  donations?: Record<string, string>; // 개인계좌: 강사가 후원금을 낸 날 (강사 id → 날짜)
}

export interface PlanTopic {
  theme: string; // 교육주제
  content: string; // 교육내용 (줄바꿈으로 구분)
  remark: string; // 비고
}

export interface PlanSession {
  topics: PlanTopic[];
  effects: string; // 기대효과 (줄바꿈으로 구분)
}

export interface Curriculum {
  id: string;
  subject: string;
  label: string; // 예: 초등 3~4학년
  purpose: string;
  sessions: PlanSession[];
}

export interface Settings {
  company: {
    name: string;
    bizNo: string;
    ceo: string;
    address: string;
    phone: string;
    email: string;
    bizType: string;
  };
  mail: {
    senderName: string;
    cc: string;
    subjectTemplate: string;
    bodyTemplate: string;
  };
  donationRate?: number; // 후원금 비율(%), 기본 20
  corpBank: { bankName: string; accountNumber: string; holder: string };
  businessRegistration?: StoredFile;
  corpAccountCopy?: StoredFile;
}

/** 정기회의 안건 (날짜 하나에 회의 하나, id = 날짜) */
export interface Meeting {
  id: string; // yyyy-mm-dd
  date: string;
  time: string; // 예: 10:00
  guide: string; // 모임 안내 문구
  agenda: { title: string; body: string }[];
  notes: string;
}

export interface AppData {
  version: number;
  instructors: Instructor[];
  orgs: Org[];
  lectures: Lecture[];
  curricula: Curriculum[];
  settings: Settings;
  meetings?: Meeting[];
  assignOrder?: string; // 강사 배정 순번 (쉼표로 구분한 이름)
  meetingGuide?: string; // 새 회의에 기본으로 넣는 모임 안내
}

/** 서류 패키지 화면에서 확정하는 강의계획서 (일정 + 과목 내용 묶음 + 수정) */
export interface LessonPlan {
  schoolYear: string;
  subject: string;
  place: string;
  instructorsText: string;
  target: string;
  leadPhone: string;
  totalTime: string;
  purpose: string;
  sessions: (PlanSession & { label: string })[];
}
