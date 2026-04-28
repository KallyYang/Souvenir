import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  createSessionToken,
  getAppPassword,
} from "@/lib/auth";

export async function POST(request: Request) {
  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "无效的请求" }, { status: 400 });
  }

  const input = (body.password || "").trim();
  if (!input) {
    return NextResponse.json({ error: "请输入密码" }, { status: 400 });
  }

  let expected: string;
  try {
    expected = getAppPassword();
  } catch {
    return NextResponse.json(
      { error: "服务端未配置 APP_PASSWORD" },
      { status: 500 },
    );
  }

  if (input !== expected) {
    return NextResponse.json({ error: "密码错误" }, { status: 401 });
  }

  const token = await createSessionToken();
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}
