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
