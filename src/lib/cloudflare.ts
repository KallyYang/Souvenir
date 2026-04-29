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

function tryGetOpenNextEnv(): EnvLike | undefined {
  try {
    const g = globalThis as unknown as {
      __OPENNEXT_CLOUDFLARE_CONTEXT__?: { env?: EnvLike };
    };
    return g.__OPENNEXT_CLOUDFLARE_CONTEXT__?.env;
  } catch {
    return undefined;
  }
}

function tryGetNextOnPagesEnv(): EnvLike | undefined {
  try {
    const g = globalThis as unknown as {
      process?: { env?: Record<string, unknown> };
    };
    const cfEnv = g.process?.env as EnvLike | undefined;
    return cfEnv;
  } catch {
    return undefined;
  }
}

function resolveEnv(): EnvLike | undefined {
  return getGlobalEnv() ?? tryGetOpenNextEnv() ?? tryGetNextOnPagesEnv();
}

export function getCloudflareKvBinding(): KvBinding | null {
  const env = resolveEnv();
  const binding = env?.SOUVENIR_KV as KvBinding | undefined;
  return binding ?? null;
}

export function getCloudflareR2Binding(): R2Binding | null {
  const env = resolveEnv();
  const binding = env?.SOUVENIR_R2 as R2Binding | undefined;
  return binding ?? null;
}

export function getCloudflareVar(name: string): string | undefined {
  const env = resolveEnv();
  const value = env?.[name];
  if (typeof value === "string" && value.length > 0) return value;
  const fromProcess = process.env?.[name];
  if (typeof fromProcess === "string" && fromProcess.length > 0) {
    return fromProcess;
  }
  return undefined;
}
