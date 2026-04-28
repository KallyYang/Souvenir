import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function getEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`环境变量 ${name} 未配置`);
  return v;
}

let _client: S3Client | null = null;

function getClient(): S3Client {
  if (_client) return _client;
  const accessKeyId = getEnv("R2_ACCESS_KEY_ID");
  const secretAccessKey = getEnv("R2_SECRET_ACCESS_KEY");
  const accountId = getEnv("R2_ACCOUNT_ID");
  _client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    requestChecksumCalculation: "WHEN_REQUIRED",
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
  return _client;
}

export function getBucket(): string {
  return getEnv("R2_BUCKET");
}

export function getPublicBaseUrl(): string {
  return getEnv("R2_PUBLIC_BASE_URL").replace(/\/+$/, "");
}

export async function createUploadPresignedUrl(params: {
  key: string;
  contentType: string;
  expiresInSeconds?: number;
}): Promise<string> {
  const client = getClient();
  const command = new PutObjectCommand({
    Bucket: getBucket(),
    Key: params.key,
    ContentType: params.contentType,
  });
  return await getSignedUrl(client, command, {
    expiresIn: params.expiresInSeconds ?? 300,
  });
}

export async function deleteObject(key: string): Promise<void> {
  const client = getClient();
  await client.send(
    new DeleteObjectCommand({
      Bucket: getBucket(),
      Key: key,
    }),
  );
}

export function buildPublicUrl(key: string): string {
  return `${getPublicBaseUrl()}/${key
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}
