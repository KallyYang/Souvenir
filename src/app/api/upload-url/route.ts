import { NextResponse } from "next/server";
import { createUploadPresignedUrl, buildPublicUrl } from "@/lib/r2";
import { isValidDate } from "@/lib/memories";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/avif",
]);

function extensionFromMime(mime: string): string {
  switch (mime) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    case "image/heic":
      return "heic";
    case "image/avif":
      return "avif";
    default:
      return "bin";
  }
}

export async function POST(request: Request) {
  let body: { date?: string; contentType?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "无效的请求" }, { status: 400 });
  }

  const date = (body.date || "").trim();
  const contentType = (body.contentType || "").trim();

  if (!isValidDate(date)) {
    return NextResponse.json(
      { error: "日期格式应为 YYYY-MM-DD" },
      { status: 400 },
    );
  }

  if (!ALLOWED_TYPES.has(contentType)) {
    return NextResponse.json(
      { error: "不支持的图片类型" },
      { status: 400 },
    );
  }

  const ext = extensionFromMime(contentType);
  const rand = Math.random().toString(36).slice(2, 10);
  const [year, month] = date.split("-");
  const key = `${year}/${month}/${Date.now()}-${rand}.${ext}`;

  try {
    const uploadUrl = await createUploadPresignedUrl({
      key,
      contentType,
      expiresInSeconds: 300,
    });
    return NextResponse.json({
      uploadUrl,
      key,
      publicUrl: buildPublicUrl(key),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "服务异常";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
