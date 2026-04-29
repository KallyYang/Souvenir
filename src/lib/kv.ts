import { getCloudflareKvBinding } from "./cloudflare";

function getEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`环境变量 ${name} 未配置`);
  return v;
}

function apiBase(): string {
  const accountId = getEnv("CF_ACCOUNT_ID");
  const namespaceId = getEnv("CF_KV_NAMESPACE_ID");
  return `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}`;
}

function authHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${getEnv("CF_API_TOKEN")}`,
  };
}

export async function kvGet<T>(key: string): Promise<T | null> {
  const binding = getCloudflareKvBinding();
  if (binding) {
    const text = await binding.get(key);
    if (!text) return null;
    try {
      return JSON.parse(text) as T;
    } catch {
      return null;
    }
  }
  const res = await fetch(`${apiBase()}/values/${encodeURIComponent(key)}`, {
    headers: authHeaders(),
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`KV 读取失败 ${res.status}: ${text}`);
  }
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export async function kvPut(key: string, value: unknown): Promise<void> {
  const binding = getCloudflareKvBinding();
  if (binding) {
    await binding.put(key, JSON.stringify(value));
    return;
  }
  const res = await fetch(`${apiBase()}/values/${encodeURIComponent(key)}`, {
    method: "PUT",
    headers: {
      ...authHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(value),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`KV 写入失败 ${res.status}: ${text}`);
  }
}

export async function kvDelete(key: string): Promise<void> {
  const binding = getCloudflareKvBinding();
  if (binding) {
    await binding.delete(key);
    return;
  }
  const res = await fetch(`${apiBase()}/values/${encodeURIComponent(key)}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok && res.status !== 404) {
    const text = await res.text();
    throw new Error(`KV 删除失败 ${res.status}: ${text}`);
  }
}
