import { Redis } from "@upstash/redis";

let _client: Redis | null = null;

function getClient(): Redis {
  if (_client) return _client;

  const url =
    process.env.KV_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.REDIS_URL;
  const token =
    process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error(
      "KV 未配置：请设置 KV_REST_API_URL / KV_REST_API_TOKEN（或 UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN）",
    );
  }

  _client = new Redis({ url, token });
  return _client;
}

export async function kvGet<T>(key: string): Promise<T | null> {
  const client = getClient();
  const value = await client.get<T>(key);
  return value ?? null;
}

export async function kvPut(key: string, value: unknown): Promise<void> {
  const client = getClient();
  await client.set(key, value);
}

export async function kvDelete(key: string): Promise<void> {
  const client = getClient();
  await client.del(key);
}
