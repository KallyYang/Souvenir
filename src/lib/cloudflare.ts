import { getCloudflareContext } from "@opennextjs/cloudflare";

type KvBinding = {
  get: (key: string) => Promise<string | null>;
  put: (key: string, value: string) => Promise<void>;
  delete: (key: string) => Promise<void>;
};

type R2Binding = {
  delete: (key: string) => Promise<unknown>;
};

type EnvLike = {
  SOUVENIR_KV?: KvBinding;
  SOUVENIR_R2?: R2Binding;
  [key: string]: unknown;
};

declare global {
  var __cloudflareEnv: EnvLike | undefined;
}

function getGlobalEnv(): EnvLike | undefined {
  if (typeof globalThis === "undefined") return undefined;
  return globalThis.__cloudflareEnv;
}

export function setCloudflareEnv(env: EnvLike | undefined): void {
  globalThis.__cloudflareEnv = env;
}

function tryGetOpenNextEnvSync(): EnvLike | undefined {
  try {
    const ctx = getCloudflareContext();
    return ctx?.env as EnvLike | undefined;
  } catch {
    return undefined;
  }
}

async function tryGetOpenNextEnvAsync(): Promise<EnvLike | undefined> {
  try {
    const ctx = await getCloudflareContext({ async: true });
    return ctx?.env as EnvLike | undefined;
  } catch {
    return undefined;
  }
}

function resolveEnvSync(): EnvLike | undefined {
  return getGlobalEnv() ?? tryGetOpenNextEnvSync();
}

async function resolveEnvAsync(): Promise<EnvLike | undefined> {
  const sync = resolveEnvSync();
  if (sync) return sync;
  return await tryGetOpenNextEnvAsync();
}

export function getCloudflareKvBinding(): KvBinding | null {
  const env = resolveEnvSync();
  const binding = env?.SOUVENIR_KV as KvBinding | undefined;
  return binding ?? null;
}

export function getCloudflareR2Binding(): R2Binding | null {
  const env = resolveEnvSync();
  const binding = env?.SOUVENIR_R2 as R2Binding | undefined;
  return binding ?? null;
}

export function getCloudflareVar(name: string): string | undefined {
  const env = resolveEnvSync();
  const value = env?.[name];
  if (typeof value === "string" && value.length > 0) return value;
  const fromProcess = process.env?.[name];
  if (typeof fromProcess === "string" && fromProcess.length > 0) {
    return fromProcess;
  }
  return undefined;
}

export async function getCloudflareVarAsync(
  name: string,
): Promise<string | undefined> {
  const env = await resolveEnvAsync();
  const value = env?.[name];
  if (typeof value === "string" && value.length > 0) return value;
  const fromProcess = process.env?.[name];
  if (typeof fromProcess === "string" && fromProcess.length > 0) {
    return fromProcess;
  }
  return undefined;
}
