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

export function getCloudflareKvBinding(): KvBinding | null {
  return getGlobalEnv()?.SOUVENIR_KV ?? null;
}

export function getCloudflareR2Binding(): R2Binding | null {
  return getGlobalEnv()?.SOUVENIR_R2 ?? null;
}
