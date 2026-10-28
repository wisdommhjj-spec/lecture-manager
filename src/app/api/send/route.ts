import nodemailer from "nodemailer";
import { NextResponse } from "next/server";

// 서류 패키지 메일 발송. 계정과 비밀번호는 환경 변수에만 둡니다 (.env.example 참고).
//  - MAIL_TEST_RECIPIENT 가 있으면 '테스트 모드': 받는 사람과 상관없이 이 주소로만 보냅니다.
//  - SEND_PASSCODE 가 있으면 화면에서 같은 값을 입력해야 보낼 수 있습니다 (공개 데모 주소 악용 방지).

export const runtime = "nodejs";

const env = () => ({
  user: (process.env.GMAIL_USER ?? "").trim(),
  // 구글은 앱 비밀번호를 4자리씩 띄어서 보여 줍니다. 공백은 빼고 씁니다.
  pass: (process.env.GMAIL_APP_PASSWORD ?? "").replace(/\s/g, ""),
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
  let b: { to?: string; cc?: string; subject?: string; body?: string; senderName?: string; zipName?: string; zipBase64?: string; passcode?: string; check?: boolean };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 잘못되었습니다." }, { status: 400 });
  }
  // 앞뒤 공백은 무시합니다 (복사·붙여 넣기 때 섞여 들어가는 경우)
  if (e.passcode && (b.passcode ?? "").trim() !== e.passcode) {
    return NextResponse.json({ error: "발송 암호가 맞지 않습니다." }, { status: 403 });
  }
  if (b.check) return NextResponse.json(await checkAccount(e));
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
    // 원인을 알 수 있게 오류 종류만 알려 줍니다 (계정 정보는 내보내지 않음)
    const x = err as { code?: string; responseCode?: number };
    const reason =
      x.code === "EAUTH" || x.responseCode === 535 || x.responseCode === 534
        ? "Gmail 로그인에 실패했습니다. GMAIL_USER(전체 Gmail 주소)와 GMAIL_APP_PASSWORD(앱 비밀번호 16자, 띄어쓰기 없이)를 확인하세요."
        : x.code === "EENVELOPE"
          ? "받는 사람 주소를 Gmail이 거부했습니다."
          : x.code === "ESOCKET" || x.code === "ETIMEDOUT" || x.code === "ECONNECTION"
            ? "Gmail 서버에 연결하지 못했습니다. 잠시 뒤 다시 시도하세요."
            : "메일을 보내지 못했습니다. 계정 설정(앱 비밀번호)을 확인하세요.";
    return NextResponse.json({ error: `${reason} (오류 코드: ${x.code ?? "-"}${x.responseCode ? ` ${x.responseCode}` : ""})` }, { status: 502 });
  }
}

/** 설정 화면의 '메일 설정 점검'. 값은 내보내지 않고 모양과 로그인 결과만 알려 줍니다. */
async function checkAccount(e: ReturnType<typeof env>) {
  const hangul = (s: string) => /[\u3131-\uD7A3]/.test(s);
  const issues: string[] = [];
  if (!/^[^\s@]+@gmail\.com$/i.test(e.user)) issues.push("GMAIL_USER가 '…@gmail.com' 형식이 아닙니다.");
  if (hangul(e.user)) issues.push("GMAIL_USER에 한글이 섞여 있습니다.");
  if (hangul(e.pass)) issues.push("GMAIL_APP_PASSWORD에 한글이 섞여 있습니다. 영문 상태로 다시 입력하세요.");
  if (e.pass.length !== 16) issues.push(`GMAIL_APP_PASSWORD가 ${e.pass.length}자입니다. 앱 비밀번호는 공백을 빼고 16자입니다.`);
  if (e.testTo && hangul(e.testTo)) issues.push("MAIL_TEST_RECIPIENT에 한글이 섞여 있습니다.");
  let login = "성공";
  try {
    await nodemailer.createTransport({ service: "gmail", auth: { user: e.user, pass: e.pass } }).verify();
  } catch (err) {
    const x = err as { code?: string; responseCode?: number };
    login = `실패 (${x.code ?? "-"}${x.responseCode ? ` ${x.responseCode}` : ""})`;
  }
  return { ok: login === "성공", login, user: mask(e.user), passLength: e.pass.length, issues };
}
