import { AwsClient } from "aws4fetch";
import { getCloudflareR2Binding } from "./cloudflare";

function getEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`环境变量 ${name} 未配置`);
  return v;
}

let _client: AwsClient | null = null;

function getClient(): AwsClient {
  if (_client) return _client;
  const accessKeyId = getEnv("R2_ACCESS_KEY_ID");
  const secretAccessKey = getEnv("R2_SECRET_ACCESS_KEY");
  _client = new AwsClient({
    accessKeyId,
    secretAccessKey,
    service: "s3",
    region: "auto",
  });
  return _client;
}

function getEndpoint(): string {
  const accountId = getEnv("R2_ACCOUNT_ID");
  return `https://${accountId}.r2.cloudflarestorage.com`;
}

export function getBucket(): string {
  return getEnv("R2_BUCKET");
}

export function getPublicBaseUrl(): string {
  return getEnv("R2_PUBLIC_BASE_URL").replace(/\/+$/, "");
}

function encodeKey(key: string): string {
  return key.split("/").map(encodeURIComponent).join("/");
}

export async function createUploadPresignedUrl(params: {
  key: string;
  contentType: string;
  expiresInSeconds?: number;
}): Promise<string> {
  const client = getClient();
  const bucket = getBucket();
  const endpoint = getEndpoint();
  const expiresIn = params.expiresInSeconds ?? 300;
  const objectUrl =
    `${endpoint}/${bucket}/${encodeKey(params.key)}` +
    `?X-Amz-Expires=${expiresIn}`;

  const signed = await client.sign(
    new Request(objectUrl, {
      method: "PUT",
      headers: {
        "Content-Type": params.contentType,
      },
    }),
    {
      aws: { signQuery: true },
    },
  );
  return signed.url;
}

export async function deleteObject(key: string): Promise<void> {
  const binding = getCloudflareR2Binding();
  if (binding) {
    await binding.delete(key);
    return;
  }
  const client = getClient();
  const bucket = getBucket();
  const endpoint = getEndpoint();
  const res = await client.fetch(
    `${endpoint}/${bucket}/${encodeKey(key)}`,
    { method: "DELETE" },
  );
  if (!res.ok && res.status !== 404) {
    throw new Error(`删除 R2 对象失败 (${res.status})`);
  }
}

export function buildPublicUrl(key: string): string {
  return `${getPublicBaseUrl()}/${encodeKey(key)}`;
}
