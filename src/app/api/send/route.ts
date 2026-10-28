import nodemailer from "nodemailer";
import { NextResponse } from "next/server";

// 서류 패키지 메일 발송. 계정과 비밀번호는 환경 변수에만 둡니다 (.env.example 참고).
//  - MAIL_TEST_RECIPIENT 가 있으면 '테스트 모드': 받는 사람과 상관없이 이 주소로만 보냅니다.
//  - SEND_PASSCODE 가 있으면 화면에서 같은 값을 입력해야 보낼 수 있습니다 (공개 데모 주소 악용 방지).

export const runtime = "nodejs";

const env = () => ({
  user: process.env.GMAIL_USER ?? "",
  pass: process.env.GMAIL_APP_PASSWORD ?? "",
  testTo: process.env.MAIL_TEST_RECIPIENT ?? "",
  passcode: (process.env.SEND_PASSCODE ?? "").trim(),
});

const mask = (s: string) => s.replace(/^(.{2}).*(@.*)$/, "$1***$2");

export async function GET() {
  const e = env();
  return NextResponse.json({
    configured: !!(e.user && e.pass),
    testMode: !!e.testTo,
    testRecipient: e.testTo ? mask(e.testTo) : "",
    needsPasscode: !!e.passcode,
  });
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  const e = env();
  if (!e.user || !e.pass) {
    return NextResponse.json({ error: "메일 계정이 설정되지 않았습니다. 관리자에게 GMAIL_USER, GMAIL_APP_PASSWORD 설정을 요청하세요." }, { status: 503 });
  }
  let b: { to?: string; cc?: string; subject?: string; body?: string; senderName?: string; zipName?: string; zipBase64?: string; passcode?: string };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 잘못되었습니다." }, { status: 400 });
  }
  // 앞뒤 공백은 무시합니다 (복사·붙여 넣기 때 섞여 들어가는 경우)
  if (e.passcode && (b.passcode ?? "").trim() !== e.passcode) {
    return NextResponse.json({ error: "발송 암호가 맞지 않습니다." }, { status: 403 });
  }
  const to = e.testTo || (b.to ?? "").trim();
  const cc = e.testTo ? "" : (b.cc ?? "").trim();
  if (!EMAIL.test(to) || (cc && !cc.split(",").every((c) => EMAIL.test(c.trim())))) {
    return NextResponse.json({ error: "받는 사람 이메일 형식이 잘못되었습니다." }, { status: 400 });
  }
  if (!b.zipName || !b.zipBase64) {
    return NextResponse.json({ error: "첨부할 zip 파일이 없습니다." }, { status: 400 });
  }
  const transport = nodemailer.createTransport({ service: "gmail", auth: { user: e.user, pass: e.pass } });
  try {
    const info = await transport.sendMail({
      from: { name: b.senderName || "바움사회적협동조합", address: e.user },
      to,
      cc: cc || undefined,
      subject: (e.testTo ? "[테스트] " : "") + (b.subject ?? ""),
      text: b.body ?? "",
      attachments: [{ filename: b.zipName, content: Buffer.from(b.zipBase64, "base64"), contentType: "application/zip" }],
    });
    return NextResponse.json({ ok: true, to, cc, testMode: !!e.testTo, messageId: info.messageId });
  } catch (err) {
    console.error("mail send failed", err);
    return NextResponse.json({ error: "메일을 보내지 못했습니다. 계정 설정(앱 비밀번호)을 확인하세요." }, { status: 502 });
  }
}
