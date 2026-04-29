import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  createSessionToken,
  getAppPassword,
} from "@/lib/auth";
import { getCloudflareContext } from "@opennextjs/cloudflare";

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
    expected = await getAppPassword();
  } catch (e) {
    const debug = await collectEnvDebug();
    return NextResponse.json(
      {
        error: "服务端未配置 APP_PASSWORD",
        detail: String(e),
        debug,
      },
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

async function collectEnvDebug(): Promise<Record<string, unknown>> {
  const debug: Record<string, unknown> = {
    nextRuntime: process.env.NEXT_RUNTIME ?? null,
    nodeEnv: process.env.NODE_ENV ?? null,
    processEnvHasAppPassword:
      typeof process.env.APP_PASSWORD === "string" &&
      process.env.APP_PASSWORD.length > 0,
    processEnvAppPasswordLen:
      typeof process.env.APP_PASSWORD === "string"
        ? process.env.APP_PASSWORD.length
        : 0,
    processEnvKeysSample: Object.keys(process.env).slice(0, 30),
  };

  try {
    const ctxSync = getCloudflareContext();
    const env = (ctxSync?.env ?? {}) as Record<string, unknown>;
    debug.syncContext = {
      ok: true,
      hasEnv: !!ctxSync?.env,
      hasAppPassword:
        typeof env.APP_PASSWORD === "string" &&
        (env.APP_PASSWORD as string).length > 0,
      envKeysSample: Object.keys(env).slice(0, 30),
    };
  } catch (err) {
    debug.syncContext = { ok: false, error: String(err) };
  }

  try {
    const ctxAsync = await getCloudflareContext({ async: true });
    const env = (ctxAsync?.env ?? {}) as Record<string, unknown>;
    debug.asyncContext = {
      ok: true,
      hasEnv: !!ctxAsync?.env,
      hasAppPassword:
        typeof env.APP_PASSWORD === "string" &&
        (env.APP_PASSWORD as string).length > 0,
      envKeysSample: Object.keys(env).slice(0, 30),
    };
  } catch (err) {
    debug.asyncContext = { ok: false, error: String(err) };
  }

  return debug;
}
