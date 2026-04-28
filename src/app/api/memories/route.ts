import { NextResponse } from "next/server";
import {
  deleteEntry,
  isValidDate,
  loadIndex,
  upsertEntry,
} from "@/lib/memories";
import { deleteObject } from "@/lib/r2";

export async function GET() {
  try {
    const idx = await loadIndex();
    return NextResponse.json({ entries: idx.entries });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "服务异常";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  let body: {
    date?: string;
    imageKey?: string;
    imageUrl?: string;
    note?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "无效的请求" }, { status: 400 });
  }

  const date = (body.date || "").trim();
  const imageKey = (body.imageKey || "").trim();
  const imageUrl = (body.imageUrl || "").trim();
  const note = (body.note || "").toString();

  if (!isValidDate(date)) {
    return NextResponse.json(
      { error: "日期格式应为 YYYY-MM-DD" },
      { status: 400 },
    );
  }
  if (!imageKey || !imageUrl) {
    return NextResponse.json({ error: "缺少图片信息" }, { status: 400 });
  }

  try {
    const idx = await loadIndex();
    const prev = idx.entries[date];
    const entry = {
      date,
      imageKey,
      imageUrl,
      note: note.slice(0, 2000),
      updatedAt: Date.now(),
    };
    await upsertEntry(entry);

    if (prev && prev.imageKey && prev.imageKey !== imageKey) {
      try {
        await deleteObject(prev.imageKey);
      } catch {
      }
    }

    return NextResponse.json({ entry });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "服务异常";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  let body: { date?: string; note?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "无效的请求" }, { status: 400 });
  }

  const date = (body.date || "").trim();
  const note = (body.note || "").toString();

  if (!isValidDate(date)) {
    return NextResponse.json(
      { error: "日期格式应为 YYYY-MM-DD" },
      { status: 400 },
    );
  }

  try {
    const idx = await loadIndex();
    const existing = idx.entries[date];
    if (!existing) {
      return NextResponse.json(
        { error: "当天还没有回忆" },
        { status: 404 },
      );
    }
    const entry = {
      ...existing,
      note: note.slice(0, 2000),
      updatedAt: Date.now(),
    };
    await upsertEntry(entry);
    return NextResponse.json({ entry });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "服务异常";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = (searchParams.get("date") || "").trim();
  if (!isValidDate(date)) {
    return NextResponse.json(
      { error: "日期格式应为 YYYY-MM-DD" },
      { status: 400 },
    );
  }

  try {
    const idx = await loadIndex();
    const existing = idx.entries[date];
    if (existing?.imageKey) {
      try {
        await deleteObject(existing.imageKey);
      } catch {
      }
    }
    await deleteEntry(date);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "服务异常";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
