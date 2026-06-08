import { SignJWT, jwtVerify } from "jose";
import { getCloudflareVarAsync } from "./cloudflare";

export const SESSION_COOKIE = "memory_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

async function getSecret(): Promise<Uint8Array> {
  const secret =
    (await getCloudflareVarAsync("SESSION_SECRET")) ||
    (await getCloudflareVarAsync("APP_PASSWORD")) ||
    "memory-dev-secret-change-me";
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(): Promise<string> {
  const secret = await getSecret();
  return await new SignJWT({ authed: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secret);
}

export async function verifySessionToken(token: string): Promise<boolean> {
  try {
    const secret = await getSecret();
    const { payload } = await jwtVerify(token, secret);
    return payload.authed === true;
  } catch {
    return false;
  }
}

export async function getAppPassword(): Promise<string> {
  const password = await getCloudflareVarAsync("APP_PASSWORD");
  if (!password) {
    throw new Error("APP_PASSWORD 未配置");
  }
  return password;
}

/**
 * 判断是否启用应用内的密码鉴权模块。
 * 当部署环境未配置 APP_PASSWORD 时，依赖外部（如 Cloudflare）鉴权，
 * 应用自身不再做密码校验。
 */
export async function isPasswordAuthEnabled(): Promise<boolean> {
  const password = await getCloudflareVarAsync("APP_PASSWORD");
  return typeof password === "string" && password.length > 0;
}
